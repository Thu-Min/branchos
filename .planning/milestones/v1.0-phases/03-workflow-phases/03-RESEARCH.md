# Phase 3: Workflow Phases - Research

**Researched:** 2026-03-08
**Domain:** Multi-phase workflow management (CLI + slash commands + state + drift detection)
**Confidence:** HIGH

## Summary

Phase 3 adds the core workflow engine to BranchOS: multi-phase workstreams with discuss, plan, and execute steps. The implementation spans four domains: (1) state schema evolution to track phases, (2) three slash commands for `.claude/commands/` that generate markdown artifacts, (3) a CLI `check-drift` command comparing planned files against actual git changes, and (4) a workstream-scoped decision log.

The existing codebase provides strong foundations. The schema migration system (`migrateIfNeeded`), Commander CLI registration pattern (`registerXxxCommand`), GitOps utilities (`getHeadHash`, `addAndCommit`, `getCommitsBehind`), output formatting (chalk + `--json`), and the slash command template pattern from Phase 2 (`map-codebase.md`) are all directly reusable. The primary new work is the phase lifecycle logic, slash command prompt design, and drift detection using `git diff --name-only`.

**Primary recommendation:** Build bottom-up: state schema v2 migration first, then phase lifecycle functions, then slash commands, then drift detection, then decision log integration. Each layer builds on the previous.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Phase lifecycle model:** Flexible with warnings: any step can run anytime, but warn if prerequisites are missing. Re-running overwrites with confirmation warning. Auto-increment phase numbering. state.json gets `phases` array with `currentPhase` field. Schema version bumps to 2 with migration from v1.
- **Artifact format & storage:** Pure markdown files with structured sections (no frontmatter, no JSON). Per-phase subdirectories: `.branchos/workstreams/<id>/phases/1/discuss.md`, `.../phases/1/plan.md`, `.../phases/1/execute.md`. Specific section lists defined for each artifact type.
- **Drift detection:** File-level comparison: plan.md lists affected files per task, compared against `git diff --name-only`. Baseline: store git commit hash when plan.md is created. On-demand `branchos check-drift` command. Categorized file list report with color-coding and `--json` support.
- **Decision log:** Workstream-level `decisions.md` in workstream root. Structured entries with title, phase number, context, choice, alternatives. Slash commands extract decisions during discuss and plan phases. Auto-committed.
- **AI-powered generation:** Via slash commands installed in `.claude/commands/` (consistent with Phase 2's map-codebase pattern). CLI handles state tracking and git commits.

### Claude's Discretion
- Exact slash command prompt template design for discuss/plan/execute
- Markdown section headers and formatting within artifacts
- How state.json migration handles existing workstreams with no phases array
- check-drift output formatting details
- How to handle edge cases (empty workstream, no git commits since plan)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WFL-01 | Each workstream supports multiple phases, each with discuss, plan, and execute steps | State schema v2 with phases array; phase lifecycle functions for creating/advancing phases |
| WFL-02 | User can run `branchos discuss-phase` to build workstream-specific discussion context | Slash command in `.claude/commands/discuss-phase.md`; CLI state tracking wrapper |
| WFL-03 | User can run `branchos plan-phase` to create an implementation plan | Slash command in `.claude/commands/plan-phase.md`; plan baseline hash storage |
| WFL-04 | User can run `branchos execute-phase` to update execution state | Slash command in `.claude/commands/execute-phase.md`; task status tracking |
| WFL-05 | Phase artifacts scoped to current workstream directory | Per-phase subdirectories under `.branchos/workstreams/<id>/phases/<n>/` |
| WFL-06 | BranchOS reconciles planned work against actual git commits to detect drift | `branchos check-drift` CLI command; `git diff --name-only` comparison |
| TEM-03 | Decisions captured in workstream-scoped decision log | `decisions.md` in workstream root; slash command prompts instruct Claude to extract decisions |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI framework | Already in use; `registerXxxCommand(program)` pattern established |
| simple-git | ^3.27.0 | Git operations | Already in use; provides `raw()` for `diff --name-only` |
| chalk | ^4.1.2 | Terminal coloring | Already in use; needed for drift report color-coding |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.0.0 | Testing | Already configured; all new modules need tests |
| fs/promises | (built-in) | File I/O | Async-first pattern already established |

### No New Dependencies Needed
This phase requires zero new npm packages. All functionality builds on the existing stack plus Node.js built-ins.

## Architecture Patterns

### New File Structure
```
src/
  phase/                    # NEW: Phase lifecycle module
    index.ts                # Phase creation, advancement, state management
    drift.ts                # Drift detection logic
    decisions.ts            # Decision log read/write
  cli/
    check-drift.ts          # NEW: CLI command for drift detection
    phase-commands.ts       # NEW: CLI wrapper commands for discuss/plan/execute (state tracking)
  state/
    schema.ts               # MODIFY: Add v1->v2 migration, bump CURRENT_SCHEMA_VERSION
    state.ts                # MODIFY: Extend WorkstreamState interface with phases
  constants.ts              # MODIFY: Add PHASES_DIR, DECISIONS_FILE constants

.claude/commands/
  discuss-phase.md          # NEW: Slash command prompt
  plan-phase.md             # NEW: Slash command prompt
  execute-phase.md          # NEW: Slash command prompt

tests/
  phase/
    index.test.ts           # Phase lifecycle tests
    drift.test.ts           # Drift detection tests
    decisions.test.ts       # Decision log tests
  cli/
    check-drift.test.ts     # CLI handler tests
```

### Pattern 1: Schema Migration v1 to v2

**What:** Extend `WorkstreamState` with phases array and currentPhase. Add migration to handle existing v1 state files that lack these fields.
**When to use:** When reading any state.json file.

```typescript
// In state.ts - extended interface
export interface PhaseStep {
  status: 'not-started' | 'in-progress' | 'complete';
  createdAt?: string;
  updatedAt?: string;
}

export interface Phase {
  number: number;
  status: 'active' | 'completed';
  discuss: PhaseStep;
  plan: PhaseStep;
  execute: PhaseStep;
  planBaseline?: string;  // git commit hash when plan.md was created
}

export interface WorkstreamState {
  schemaVersion: number;
  status: 'created' | 'in-progress' | 'completed';
  tasks: unknown[];
  currentPhase: number;
  phases: Phase[];
}

// In schema.ts - migration
export const migrations: Migration[] = [
  {
    fromVersion: 1,
    migrate: (data) => ({
      ...data,
      schemaVersion: 2,
      currentPhase: 0,
      phases: [],
    }),
  },
];
export const CURRENT_SCHEMA_VERSION = 2;
```

### Pattern 2: Slash Command + CLI State Wrapper

**What:** The slash commands (`.claude/commands/`) handle AI-powered artifact generation. The CLI commands handle state tracking, directory creation, and git commits. Users invoke slash commands directly; the slash command prompts instruct Claude to also update state via the CLI.
**When to use:** For all three workflow steps (discuss, plan, execute).

The established pattern from Phase 2: the slash command file is a prompt template that instructs Claude Code what to do. The `$ARGUMENTS` variable captures user input. The slash command should:
1. Read current workstream state
2. Generate the appropriate artifact
3. Write to the correct phase subdirectory
4. Auto-commit via git

```markdown
---
description: Create/update discussion context for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(branchos *)
---

# Discuss Phase

... prompt instructions ...

$ARGUMENTS
```

### Pattern 3: Drift Detection via simple-git raw()

**What:** Use `simple-git`'s `raw()` method to run `git diff --name-only <baseline>..HEAD` for comparing planned vs actual file changes.
**When to use:** In the `check-drift` command.

```typescript
// GitOps extension needed
async getChangedFiles(fromHash: string): Promise<string[]> {
  try {
    const result = await this.git.raw(['diff', '--name-only', fromHash + '..HEAD']);
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
```

### Pattern 4: Handler Exported Separately (Testability)

**What:** Follow established pattern where handler logic is a standalone exported async function, and command registration calls it.
**When to use:** For check-drift and any CLI-facing phase commands.

```typescript
// Established pattern from map-status.ts
export async function checkDriftHandler(options: CheckDriftOptions): Promise<DriftResult> {
  // ... logic ...
}

export function registerCheckDriftCommand(program: Command): void {
  program
    .command('check-drift')
    .description('Compare planned work against actual git commits')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      await checkDriftHandler({ json: opts.json });
    });
}
```

### Anti-Patterns to Avoid
- **Frontmatter in phase artifacts:** Decision says "no frontmatter, no JSON" for discuss.md/plan.md/execute.md. Use pure markdown with structured sections. The plan baseline hash goes in state.json, NOT in the markdown file.
- **Coupling slash commands to CLI binary:** Slash commands should use git commands and file writes directly (Claude Code has these tools). Don't require the branchos CLI to be built and on PATH within slash commands.
- **Shared phase state:** Phase artifacts go in workstream-scoped directories, never in `.branchos/shared/`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git diff operations | Custom child_process exec | `GitOps.raw()` via simple-git | Error handling, path resolution already solved |
| Schema migration | Manual version checks | Existing `migrateIfNeeded<T>()` | Pattern established, just add migration entry |
| CLI command structure | Ad-hoc argument parsing | Commander with `registerXxxCommand` | Consistency with existing commands |
| Terminal output formatting | Raw console.log | `output()`, `success()`, `warning()`, `error()` | `--json` support automatic |
| Workstream discovery | Directory scanning | `discoverWorkstreams()` | Already handles missing dirs gracefully |

**Key insight:** Phase 3 should feel like a natural extension of the existing codebase. Every new file should follow patterns visible in Phase 1 and Phase 2 code.

## Common Pitfalls

### Pitfall 1: Phase Numbering Off-by-One
**What goes wrong:** Auto-increment creates phase 0 or skips a number.
**Why it happens:** Confusion between array index and phase number (phases are 1-indexed per CONTEXT.md).
**How to avoid:** `nextPhaseNumber = state.phases.length + 1`. Store phase number explicitly in the Phase object.
**Warning signs:** Tests showing phase 0 or gaps in numbering.

### Pitfall 2: Plan Baseline Hash Not Stored
**What goes wrong:** `check-drift` has no baseline to compare against, making drift detection impossible.
**Why it happens:** Forgetting to capture `git rev-parse HEAD` when plan.md is written.
**How to avoid:** Store `planBaseline` in the Phase object in state.json when plan step completes. The slash command prompt must instruct this.
**Warning signs:** `check-drift` always showing "no baseline" errors.

### Pitfall 3: State.json Race with Slash Commands
**What goes wrong:** Slash command writes artifact, then CLI updates state, but state.json was modified in between.
**Why it happens:** Slash commands and CLI are separate processes.
**How to avoid:** Have the slash command handle ALL writes (artifact + state update + git commit) in a single flow. The slash command prompt instructs Claude to read state.json, update it, and write it back as part of the same operation.
**Warning signs:** State.json losing phase data.

### Pitfall 4: Missing Workstream Detection
**What goes wrong:** Running `branchos discuss-phase` on a branch with no workstream gives cryptic error.
**Why it happens:** No workstream exists yet for current branch.
**How to avoid:** Detect current branch, find matching workstream, give helpful error: "No workstream found for branch 'X'. Run `branchos workstream create` first."
**Warning signs:** Stack traces instead of user-friendly messages.

### Pitfall 5: Parsing Planned Files from plan.md
**What goes wrong:** Drift detection can't extract the "affected files" list from plan.md.
**Why it happens:** Free-form markdown is hard to parse reliably.
**How to avoid:** Define a consistent format in the plan-phase slash command prompt. Use a specific markdown pattern like a list under "### Affected Files" per task, or a consolidated list. Parse with simple line-by-line scanning.
**Warning signs:** Drift detection showing 0 planned files.

### Pitfall 6: Decisions.md Append-Only Corruption
**What goes wrong:** Re-running discuss-phase overwrites decisions.md instead of appending.
**Why it happens:** Using `writeFile` instead of reading + appending.
**How to avoid:** Always read existing decisions.md first, then append new entries. The slash command prompt must instruct "read existing decisions.md and append new decisions, do not overwrite."
**Warning signs:** Decisions disappearing between phases.

## Code Examples

### Phase Directory Creation
```typescript
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { BRANCHOS_DIR, WORKSTREAMS_DIR } from '../constants.js';

export async function ensurePhaseDir(
  repoRoot: string,
  workstreamId: string,
  phaseNumber: number,
): Promise<string> {
  const phaseDir = join(
    repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR,
    workstreamId, 'phases', String(phaseNumber),
  );
  await mkdir(phaseDir, { recursive: true });
  return phaseDir;
}
```

### Drift Detection Core Logic
```typescript
export interface DriftResult {
  baseline: string;
  currentHead: string;
  planned: string[];
  actual: string[];
  plannedAndChanged: string[];   // on track
  plannedNotChanged: string[];   // incomplete
  changedNotPlanned: string[];   // unplanned work
}

export function categorizeChanges(
  planned: string[],
  actual: string[],
): Pick<DriftResult, 'plannedAndChanged' | 'plannedNotChanged' | 'changedNotPlanned'> {
  const actualSet = new Set(actual);
  const plannedSet = new Set(planned);

  return {
    plannedAndChanged: planned.filter(f => actualSet.has(f)),
    plannedNotChanged: planned.filter(f => !actualSet.has(f)),
    changedNotPlanned: actual.filter(f => !plannedSet.has(f)),
  };
}
```

### Parsing Affected Files from plan.md
```typescript
// plan.md uses a consistent pattern:
// ### Affected Files
// - `src/foo.ts`
// - `src/bar.ts`
export function parseAffectedFiles(planContent: string): string[] {
  const files: string[] = [];
  const lines = planContent.split('\n');
  let inAffectedSection = false;

  for (const line of lines) {
    if (/^###?\s+affected\s+files/i.test(line)) {
      inAffectedSection = true;
      continue;
    }
    if (inAffectedSection && /^##/.test(line)) {
      inAffectedSection = false;
      continue;
    }
    if (inAffectedSection) {
      const match = line.match(/^-\s+`([^`]+)`/);
      if (match) {
        files.push(match[1]);
      }
    }
  }
  return files;
}
```

### Decision Log Entry Format
```typescript
export interface DecisionEntry {
  title: string;
  phase: number;
  context: string;
  choice: string;
  alternatives: string[];
}

export function formatDecisionEntry(entry: DecisionEntry): string {
  const altList = entry.alternatives.length > 0
    ? entry.alternatives.map(a => `- ${a}`).join('\n')
    : '- None considered';

  return `### ${entry.title}

**Phase:** ${entry.phase}
**Context:** ${entry.context}
**Decision:** ${entry.choice}
**Alternatives considered:**
${altList}

---
`;
}
```

### Resolving Current Workstream from Branch
```typescript
import { GitOps } from '../git/index.js';
import { discoverWorkstreams } from '../workstream/discover.js';
import { readMeta } from '../state/meta.js';
import { join } from 'path';
import { BRANCHOS_DIR, WORKSTREAMS_DIR } from '../constants.js';

export async function resolveCurrentWorkstream(
  repoRoot: string,
): Promise<{ id: string; path: string } | null> {
  const git = new GitOps(repoRoot);
  const branch = await git.getCurrentBranch();
  const wsDir = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR);
  const ids = await discoverWorkstreams(wsDir);

  for (const id of ids) {
    const metaPath = join(wsDir, id, 'meta.json');
    const meta = await readMeta(metaPath);
    if (meta.branch === branch) {
      return { id, path: join(wsDir, id) };
    }
  }
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| State v1 (no phases) | State v2 (phases array + currentPhase) | This phase | All existing state.json files auto-migrated on read |
| Single map-codebase slash command | Three workflow slash commands + map-codebase | This phase | `.claude/commands/` becomes the primary BranchOS-Claude interface |
| No drift tracking | File-level plan-vs-actual comparison | This phase | Developers get visibility into plan adherence |

## Open Questions

1. **How should slash commands discover the current workstream?**
   - What we know: Slash commands run in Claude Code context. They can execute bash commands.
   - What's unclear: Whether the slash command should call `branchos` CLI to resolve workstream, or directly read `.branchos/workstreams/` by scanning for matching branch.
   - Recommendation: Have the slash command use `git branch --show-current` + scan `.branchos/workstreams/*/meta.json` directly (fewer dependencies). Include this as boilerplate in each slash command prompt.

2. **How to handle concurrent phase artifacts?**
   - What we know: CONTEXT.md says re-running overwrites with confirmation warning.
   - What's unclear: How does a slash command "confirm"? Claude Code can ask the user.
   - Recommendation: The slash command prompt should instruct Claude to check if the artifact already exists and ask before overwriting.

3. **How granular should the plan.md "affected files" format be?**
   - What we know: Drift detection parses this list. Needs to be machine-parseable.
   - What's unclear: Per-task file lists vs a single consolidated list.
   - Recommendation: Both. Per-task `### Affected Files` sections for human readability, plus the parser collects all unique files across all tasks.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFL-01 | Phase creation, numbering, state tracking | unit | `npx vitest run tests/phase/index.test.ts -x` | No - Wave 0 |
| WFL-02 | discuss-phase slash command produces discuss.md | integration | `npx vitest run tests/phase/discuss.test.ts -x` | No - Wave 0 |
| WFL-03 | plan-phase slash command produces plan.md with baseline | integration | `npx vitest run tests/phase/plan.test.ts -x` | No - Wave 0 |
| WFL-04 | execute-phase slash command produces execute.md | integration | `npx vitest run tests/phase/execute.test.ts -x` | No - Wave 0 |
| WFL-05 | Artifacts stored in workstream-scoped phase dirs | unit | `npx vitest run tests/phase/index.test.ts -x` | No - Wave 0 |
| WFL-06 | Drift detection categorizes planned vs actual | unit | `npx vitest run tests/phase/drift.test.ts -x` | No - Wave 0 |
| TEM-03 | Decision log append and formatting | unit | `npx vitest run tests/phase/decisions.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase/index.test.ts` -- covers WFL-01, WFL-05 (phase lifecycle, directory creation, state management)
- [ ] `tests/phase/drift.test.ts` -- covers WFL-06 (drift categorization, file parsing, git diff integration)
- [ ] `tests/phase/decisions.test.ts` -- covers TEM-03 (decision entry formatting, append behavior)
- [ ] `tests/cli/check-drift.test.ts` -- covers WFL-06 CLI layer (handler export, --json flag, output formatting)
- [ ] `tests/state/schema.test.ts` -- EXISTING but needs v1->v2 migration test cases added

Note: WFL-02, WFL-03, WFL-04 slash command testing is limited to verifying the prompt files exist and are well-formed. The actual AI generation cannot be unit-tested; it requires manual UAT. The testable part is the state tracking and file I/O that supports those commands.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/state/schema.ts`, `src/state/state.ts`, `src/git/index.ts` -- direct code inspection
- Existing test patterns: `tests/cli/map-status.test.ts` -- established test conventions
- Existing slash command: `.claude/commands/map-codebase.md` -- template pattern
- simple-git `raw()` method -- used in existing `getCommitsBehind()` for arbitrary git commands

### Secondary (MEDIUM confidence)
- simple-git supports `git diff --name-only` via `raw()` -- inferred from existing `raw(['rev-list', ...])` usage pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- follows established patterns directly
- Pitfalls: HIGH -- derived from concrete codebase analysis
- Drift detection: MEDIUM -- `git diff --name-only` via `raw()` is inferred but highly likely given existing `raw()` usage
- Slash command prompts: MEDIUM -- prompt design is discretionary, no external API to verify

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, internal project)
