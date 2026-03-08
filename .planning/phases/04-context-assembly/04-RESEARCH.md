# Phase 4: Context Assembly - Research

**Researched:** 2026-03-08
**Domain:** CLI command + slash command for deterministic context packet assembly
**Confidence:** HIGH

## Summary

Phase 4 is a **file-reading and string-concatenation** phase. The `branchos context` CLI command reads workstream state, codebase map files, phase artifacts, decisions, and git diff output, then assembles them into a markdown context packet. No AI is involved at the CLI level. A thin slash command wraps the CLI to instruct Claude Code to run it and use the output.

The codebase already provides all the building blocks: `resolveCurrentWorkstream()`, `readState()`, `getCurrentPhase()`, `checkStaleness()`, `GitOps` for git operations, chalk-based output formatting with `--json` support, and Commander registration patterns. The new command follows established patterns exactly -- it is structurally identical to `check-drift` (resolve workstream, read state, gather data, format output).

**Primary recommendation:** Build `src/cli/context.ts` with a separate `contextHandler()` export, create `src/context/assemble.ts` for the pure assembly logic (easy to test), create `.claude/commands/context.md` as a thin wrapper, and add hint lines to the three existing slash commands.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New standalone `/context` slash command in `.claude/commands/context.md`
- CLI command `branchos context` does the actual assembly deterministically from files
- Slash command wraps the CLI: instructs Claude to run `branchos context` and use the output
- Auto-detect current workflow step from state.json (currentPhase + step statuses); user can override with `branchos context discuss|plan|execute`
- Add a hint at the top of existing slash commands (discuss-phase, plan-phase, execute-phase): "Tip: Run /context first for full workstream context." Existing commands unchanged otherwise
- Header: workstream ID, branch, current phase number, step status, codebase map freshness (with staleness warning if behind HEAD)
- Codebase map: include ARCHITECTURE.md and CONVENTIONS.md always; add MODULES.md only for plan and execute steps
- Branch diff: `git diff --name-status` and `git diff --stat` against plan baseline (or branch point if no baseline)
- Phase artifacts: current phase only (prior phases captured in decisions.md)
- decisions.md: always included (cumulative across all phases)
- No prior phase artifacts -- decisions.md serves as the cross-phase memory
- **Discuss step:** header + ARCHITECTURE.md + CONVENTIONS.md + decisions.md + branch diff
- **Plan step:** header + discuss.md + MODULES.md + CONVENTIONS.md + decisions.md + branch diff
- **Execute step:** header + plan.md + execute.md (if exists) + branch diff + decisions.md (no codebase map files)
- **Fallback (no active phase):** header + ARCHITECTURE.md + CONVENTIONS.md + decisions.md + branch diff + hint to run /discuss-phase
- No truncation or token budgeting -- include everything the step needs
- Output format: standard markdown with `## Section` headings per section
- Staleness warning inline in header when codebase map is behind HEAD (reuses existing `checkStaleness()`)
- `--json` flag supported (consistent with Phase 1 convention) -- returns structured JSON with sections as fields

### Claude's Discretion
- Exact markdown formatting and section ordering within the context packet
- Slash command prompt template wording
- How to handle missing files gracefully (e.g., no codebase map yet, no decisions.md)
- Git diff baseline selection logic when no planBaseline exists
- Error messaging for edge cases (no workstream, no branchos init)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTX-01 | BranchOS assembles a focused context packet combining: shared repo baseline, workstream metadata, branch diff summary, current plan, and execution state | Assembly logic in `src/context/assemble.ts` reads all required files and concatenates into markdown. Reuses `resolveCurrentWorkstream()`, `readState()`, `getCurrentPhase()`, `checkStaleness()`, and `GitOps`. |
| CTX-02 | Context packets are delivered via Claude Code slash commands | New `.claude/commands/context.md` slash command wraps `branchos context` CLI. Follows established slash command pattern with YAML frontmatter. |
| CTX-03 | Context assembly is phase-aware -- discuss phase gets architecture + conventions, plan phase gets discuss output + patterns, execute phase gets plan + test patterns | Step detection from `state.json` phase statuses. Phase-aware filtering maps defined in CONTEXT.md decisions. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI command registration | Already in use; `registerXxxCommand(program)` pattern |
| simple-git | ^3.27.0 | Git operations (diff, merge-base) | Already in use via `GitOps` class |
| chalk | ^4.1.2 | Terminal output coloring | Already in use via output module |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fs/promises | (built-in) | Async file reading | All file I/O in assembly |
| path | (built-in) | Path construction | Joining workstream/phase paths |

### Alternatives Considered
None. No new dependencies needed. Everything is built-in or already installed.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  context/
    assemble.ts          # Pure assembly logic (step detection, file gathering, markdown formatting)
  cli/
    context.ts           # Commander registration + contextHandler (thin CLI wrapper)
.claude/
  commands/
    context.md           # Slash command (thin wrapper around `branchos context`)
    discuss-phase.md     # Add hint line (existing, minor edit)
    plan-phase.md        # Add hint line (existing, minor edit)
    execute-phase.md     # Add hint line (existing, minor edit)
```

### Pattern 1: Separate Handler from Registration
**What:** Export both `contextHandler()` and `registerContextCommand()` from `src/cli/context.ts`. The handler contains the I/O orchestration logic; registration just wires Commander.
**When to use:** Every CLI command in this project follows this pattern.
**Example:**
```typescript
// src/cli/context.ts -- follows check-drift.ts pattern exactly
export interface ContextOptions {
  json?: boolean;
  cwd?: string;
}

export async function contextHandler(
  step: string | undefined,   // 'discuss' | 'plan' | 'execute' | undefined
  options: ContextOptions,
): Promise<ContextPacket | null> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();
  const ws = await resolveCurrentWorkstream(repoRoot);
  // ... resolve step, assemble, output
}

export function registerContextCommand(program: Command): void {
  program
    .command('context')
    .description('Assemble phase-appropriate context packet for current workstream')
    .argument('[step]', 'Workflow step: discuss, plan, or execute (auto-detected if omitted)')
    .option('--json', 'Output in JSON format', false)
    .action(async (step, opts) => { /* ... */ });
}
```

### Pattern 2: Pure Assembly Function
**What:** A pure function that takes resolved data (state, file contents, diff output) and returns a structured context packet. No I/O inside.
**When to use:** Makes testing trivial -- pass in data, assert on output.
**Example:**
```typescript
// src/context/assemble.ts
export interface ContextPacket {
  header: string;
  sections: ContextSection[];
  raw: string;          // Full markdown output
}

export interface ContextSection {
  name: string;
  content: string;
}

export type WorkflowStep = 'discuss' | 'plan' | 'execute' | 'fallback';

export function detectStep(phase: Phase | null): WorkflowStep {
  if (!phase) return 'fallback';
  if (phase.execute.status === 'in-progress') return 'execute';
  if (phase.plan.status === 'complete') return 'execute';
  if (phase.discuss.status === 'complete') return 'plan';
  return 'discuss';
}

export function assembleContext(input: AssemblyInput): ContextPacket {
  // Pure function: input data -> output markdown
}
```

### Pattern 3: Slash Command as Thin Wrapper
**What:** The `.claude/commands/context.md` slash command simply tells Claude to run the CLI and use the output.
**When to use:** Consistent with the established pattern where CLI handles state/git, slash commands handle AI interaction.
**Example:**
```markdown
---
description: Load workstream context for current phase
allowed-tools: Bash(npx branchos *)
---

# Load Context

Run the following command to assemble context for your current workstream and phase:

\`\`\`bash
npx branchos context $ARGUMENTS
\`\`\`

Use the output as your working context for this session. The context packet includes:
- Workstream metadata and current phase status
- Relevant codebase map sections (architecture, conventions, modules)
- Branch diff summary showing what has changed
- Current phase artifacts (discussion, plan, or execution state)
- Accumulated decisions from all phases

If any warnings appear (e.g., stale codebase map), address them before proceeding.

$ARGUMENTS
```

### Anti-Patterns to Avoid
- **Don't put I/O in the assembly function:** Keep `assembleContext()` pure. File reads and git commands happen in the handler, results are passed to the assembler.
- **Don't duplicate workstream resolution logic:** Use existing `resolveCurrentWorkstream()` -- do not reimplement branch-to-workstream matching.
- **Don't hardcode file paths:** Use constants from `src/constants.ts` (`BRANCHOS_DIR`, `SHARED_DIR`, `CODEBASE_DIR`, `WORKSTREAMS_DIR`, `PHASES_DIR`, `DECISIONS_FILE`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workstream resolution | Branch-to-workstream matching | `resolveCurrentWorkstream()` from `src/phase/index.ts` | Already handles meta.json scanning, error cases |
| State reading + migration | JSON parsing with schema handling | `readState()` from `src/state/state.ts` | Handles schema migration automatically |
| Codebase map staleness | Commit comparison logic | `checkStaleness()` from `src/map/staleness.ts` | Returns `StalenessResult` with `commitsBehind`, `isStale` |
| Phase state querying | Phase lookup logic | `getCurrentPhase()` from `src/phase/index.ts` | Already handles `currentPhase === 0` case |
| Map file names | Hardcoded file list | `MAP_FILES` from `src/map/metadata.ts` | Single source of truth for map file names |
| Output formatting | Custom JSON/text logic | `output()`, `error()`, `warning()` from `src/output/index.ts` | Handles `--json` flag consistently |

**Key insight:** This phase is 80% wiring together existing utilities. The new code is primarily the step-detection logic, the section-composition rules, and the markdown formatting.

## Common Pitfalls

### Pitfall 1: Missing Files During Assembly
**What goes wrong:** The command crashes when a file doesn't exist (e.g., no codebase map yet, no decisions.md, no discuss.md for plan step).
**Why it happens:** Using `readFile()` without try/catch on optional files.
**How to avoid:** Every file read that might not exist should be wrapped in try/catch returning empty string or null. The context packet should gracefully omit sections when their source files don't exist, with an inline note like `> No codebase map found. Run /map-codebase to generate one.`
**Warning signs:** Tests that only test the happy path.

### Pitfall 2: Step Auto-Detection Logic
**What goes wrong:** The auto-detected step doesn't match user expectations (e.g., user just finished discuss but hasn't started plan, system detects "plan" but user wants to re-read discuss context).
**Why it happens:** Ambiguous step transitions in state.json.
**How to avoid:** Use clear precedence rules: check step statuses in order (execute in-progress -> execute, plan complete -> execute, discuss complete -> plan, discuss in-progress or not-started -> discuss). Always allow explicit override via CLI argument. Show detected step in header so user can verify.
**Warning signs:** No test cases for edge transitions.

### Pitfall 3: Git Diff Baseline Selection
**What goes wrong:** Branch diff shows nothing or shows too much because the baseline is wrong.
**Why it happens:** `planBaseline` only exists after plan-phase runs. Before that, we need the branch point (merge-base with main/master).
**How to avoid:** Implement fallback chain: (1) use `planBaseline` from current phase if exists, (2) use `git merge-base HEAD main` (or master) to find branch point, (3) if on main itself, show empty diff with a note. The `GitOps` class currently lacks `getMergeBase()` -- this needs to be added.
**Warning signs:** Tests only covering the planBaseline-exists case.

### Pitfall 4: Large Diff Output
**What goes wrong:** `git diff --stat` produces enormous output on large branches, bloating the context packet.
**Why it happens:** No truncation policy (per user decision), but git diff stat can be huge.
**How to avoid:** Since user decided no truncation, just use `--stat` and `--name-status` as-is. But cap the raw diff output at something reasonable (e.g., 200 lines for name-status) with a note saying "N more files not shown" if truncated. This is presentation formatting, not truncation of content.
**Warning signs:** N/A -- this is an edge case for very large branches.

### Pitfall 5: Importing New Module in CLI Entry Point
**What goes wrong:** Forgetting to register the new command in `src/cli/index.ts`.
**Why it happens:** New file created but not wired into the command tree.
**How to avoid:** Checklist: (1) create `src/cli/context.ts`, (2) add `import { registerContextCommand }` to `src/cli/index.ts`, (3) call `registerContextCommand(program)`.

## Code Examples

### Step Detection Logic
```typescript
// src/context/assemble.ts
import type { Phase } from '../state/state.js';

export type WorkflowStep = 'discuss' | 'plan' | 'execute' | 'fallback';

export function detectStep(phase: Phase | null): WorkflowStep {
  if (!phase) return 'fallback';
  // If execute is underway, show execute context
  if (phase.execute.status === 'in-progress' || phase.execute.status === 'complete') {
    return 'execute';
  }
  // If plan is done, show execute context (ready to execute)
  if (phase.plan.status === 'complete') {
    return 'execute';
  }
  // If discuss is done, show plan context (ready to plan)
  if (phase.discuss.status === 'complete') {
    return 'plan';
  }
  // Otherwise show discuss context
  return 'discuss';
}
```

### Section Composition Per Step
```typescript
// Section rules from CONTEXT.md decisions
const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss: ['header', 'architecture', 'conventions', 'decisions', 'branchDiff'],
  plan:    ['header', 'discuss', 'modules', 'conventions', 'decisions', 'branchDiff'],
  execute: ['header', 'plan', 'execute', 'branchDiff', 'decisions'],
  fallback:['header', 'architecture', 'conventions', 'decisions', 'branchDiff', 'hint'],
};
```

### Git Merge-Base for Branch Point
```typescript
// Addition to GitOps class
async getMergeBase(targetBranch: string): Promise<string | null> {
  try {
    const result = await this.git.raw(['merge-base', 'HEAD', targetBranch]);
    return result.trim();
  } catch {
    return null;
  }
}

async getDiffNameStatus(fromHash: string): Promise<string> {
  try {
    return await this.git.raw(['diff', '--name-status', fromHash + '..HEAD']);
  } catch {
    return '';
  }
}

async getDiffStat(fromHash: string): Promise<string> {
  try {
    return await this.git.raw(['diff', '--stat', fromHash + '..HEAD']);
  } catch {
    return '';
  }
}
```

### Header Assembly
```typescript
function buildHeader(
  workstreamId: string,
  branch: string,
  phaseNumber: number,
  stepStatuses: { discuss: string; plan: string; execute: string },
  staleness: StalenessResult,
  detectedStep: WorkflowStep,
): string {
  let header = `## Context Packet\n\n`;
  header += `| Field | Value |\n|-------|-------|\n`;
  header += `| Workstream | ${workstreamId} |\n`;
  header += `| Branch | ${branch} |\n`;
  header += `| Phase | ${phaseNumber} |\n`;
  header += `| Step | ${detectedStep} |\n`;
  header += `| Discuss | ${stepStatuses.discuss} |\n`;
  header += `| Plan | ${stepStatuses.plan} |\n`;
  header += `| Execute | ${stepStatuses.execute} |\n`;
  if (staleness.exists) {
    header += `| Map freshness | ${staleness.commitsBehind} commits behind HEAD |\n`;
    if (staleness.isStale) {
      header += `\n> **Warning:** Codebase map is stale (${staleness.commitsBehind} commits behind). Run /map-codebase to refresh.\n`;
    }
  } else {
    header += `| Map freshness | No codebase map found |\n`;
    header += `\n> **Note:** No codebase map exists. Run /map-codebase to generate one.\n`;
  }
  return header;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual context loading | Automated context assembly | Phase 4 (this phase) | Users run one command instead of manually reading multiple files |

**No deprecated patterns apply** -- this is a new command being added to an established codebase with clear patterns.

## Open Questions

1. **Merge-base branch detection**
   - What we know: Need `git merge-base HEAD main` for branch point when no planBaseline exists
   - What's unclear: Should we try `main` first, then `master`, then `develop`? Or read from config?
   - Recommendation: Try `main` then `master` (matches `PROTECTED_BRANCHES` constant). If both fail, skip branch diff with a note.

2. **Step override validation**
   - What we know: User can pass `branchos context discuss|plan|execute` to override
   - What's unclear: Should we warn if overriding to a step whose artifacts don't exist?
   - Recommendation: Allow override but show warning if expected artifacts missing (e.g., "Note: No discuss.md found for this phase").

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/context` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | Assembly combines workstream metadata, codebase map, branch diff, plan, execution state | unit | `npx vitest run tests/context/assemble.test.ts -t "assembles"` | No - Wave 0 |
| CTX-01 | Missing files handled gracefully (no crash) | unit | `npx vitest run tests/context/assemble.test.ts -t "missing"` | No - Wave 0 |
| CTX-02 | CLI command registered and outputs markdown | unit | `npx vitest run tests/cli/context.test.ts -t "context"` | No - Wave 0 |
| CTX-02 | --json flag returns structured JSON | unit | `npx vitest run tests/cli/context.test.ts -t "json"` | No - Wave 0 |
| CTX-03 | Discuss step includes architecture + conventions, excludes modules | unit | `npx vitest run tests/context/assemble.test.ts -t "discuss"` | No - Wave 0 |
| CTX-03 | Plan step includes discuss.md + modules, excludes architecture | unit | `npx vitest run tests/context/assemble.test.ts -t "plan"` | No - Wave 0 |
| CTX-03 | Execute step includes plan.md + execute.md, excludes codebase map | unit | `npx vitest run tests/context/assemble.test.ts -t "execute"` | No - Wave 0 |
| CTX-03 | Step auto-detection from state.json | unit | `npx vitest run tests/context/assemble.test.ts -t "detectStep"` | No - Wave 0 |
| CTX-03 | Fallback step when no active phase | unit | `npx vitest run tests/context/assemble.test.ts -t "fallback"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/context`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/context/assemble.test.ts` -- covers CTX-01, CTX-03 (assembly logic, step detection, section composition)
- [ ] `tests/cli/context.test.ts` -- covers CTX-02 (CLI registration, handler, --json output)
- [ ] `tests/git/index.test.ts` -- covers new GitOps methods (getMergeBase, getDiffNameStatus, getDiffStat) -- may extend existing test file if one exists

## Sources

### Primary (HIGH confidence)
- Project source code: `src/cli/*.ts`, `src/phase/index.ts`, `src/state/state.ts`, `src/git/index.ts`, `src/map/staleness.ts`, `src/map/metadata.ts`, `src/output/index.ts`, `src/constants.ts`
- Existing slash commands: `.claude/commands/discuss-phase.md`, `plan-phase.md`, `execute-phase.md`, `map-codebase.md`
- Existing tests: `tests/cli/check-drift.test.ts` (pattern reference)
- Phase 4 CONTEXT.md: `.planning/phases/04-context-assembly/04-CONTEXT.md`
- Project config: `package.json`, `tsconfig.json`, `vitest.config.ts`

### Secondary (MEDIUM confidence)
- simple-git `raw()` method for git merge-base, diff --name-status, diff --stat (consistent with existing usage in GitOps class)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns established in prior phases
- Architecture: HIGH - follows exact patterns from check-drift, phase-commands, existing slash commands
- Pitfalls: HIGH - based on direct code inspection of existing error handling patterns

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- internal project patterns, no external API dependencies)
