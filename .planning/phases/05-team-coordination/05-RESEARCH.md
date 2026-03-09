# Phase 5: Team Coordination - Research

**Researched:** 2026-03-09
**Domain:** CLI commands for workstream visibility, file-level conflict detection, archival, and branch-switch prompts
**Confidence:** HIGH

## Summary

Phase 5 adds four new CLI commands (`status`, `detect-conflicts`, `archive`, `unarchive`) and a branch-switch prompt middleware to BranchOS. The codebase already has all the foundational building blocks: `discoverWorkstreams()` for scanning workstream directories, `readMeta()`/`writeMeta()` for meta.json access (with `status: 'active' | 'archived'` already in the type), `readState()` for phase/step data, `parseAffectedFiles()` for extracting planned files from plan.md, and `GitOps` for branch and diff operations. The `registerXxxCommand(program)` pattern is well-established across six existing command modules.

This phase is primarily a composition exercise -- combining existing primitives into new commands. No new external dependencies are needed. The main complexity lies in conflict detection (cross-workstream file comparison with severity classification) and the interactive branch-switch prompt (reading from stdin without adding dependencies).

**Primary recommendation:** Build each command as an independent CLI module following the established `handler + register` pattern. Use Node.js built-in `readline` for the interactive prompt. Reuse `discoverWorkstreams()`, `readMeta()`, `readState()`, `parseAffectedFiles()`, and `GitOps.getChangedFiles()` directly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Status command**: Full detail per row (workstream ID, branch, current phase + step, last activity, status). Active only by default; `--all` for archived. Last activity from `meta.json updatedAt`. Current branch highlighted with marker. `--json` flag.
- **Conflict detection**: Compare both planned files (from plan.md) AND actual changed files (git diff). Default scope: current workstream vs all others; `--all` for every pair. Output grouped by file. Two severity levels: High (both actual) and Medium (planned involved). `--json` flag.
- **Workstream archival**: Manual trigger only. Archive = set meta.json status to 'archived' + update updatedAt. Directory stays in place. Warn if branch not merged; require `--force` or confirmation. `branchos unarchive` to flip back. Archived excluded from status and detect-conflicts by default.
- **Branch-switch prompts**: Triggered on workstream-scoped commands only (discuss-phase, plan-phase, execute-phase, context, check-drift). Interactive prompt with y/n. If confirmed, create workstream inline then continue. If declined, exit gracefully. Protected branches excluded.

### Claude's Discretion
- Table formatting and column widths for status output
- Exact severity labels and color coding for conflict detection
- Edge case handling (deleted branches, workstreams with no phases, merge detection method)
- Interactive prompt library choice (readline, inquirer, or simple stdin)
- Error messaging wording

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WRK-03 | User can run `branchos status` to see all active workstreams, their branches, phases, and last activity | `discoverWorkstreams()` + `readMeta()` + `readState()` provide all data. Chalk for table formatting. |
| WRK-04 | User can archive a completed workstream after its branch merges | `readMeta()`/`writeMeta()` already support `status: 'archived'`. GitOps can check merge status. |
| WRK-05 | When user switches to a branch with no workstream, BranchOS prompts to create one | `resolveCurrentWorkstream()` returns null when no match. Node.js readline for interactive prompt. |
| TEM-01 | User can run `branchos detect-conflicts` to identify file-level overlap between active workstreams | `parseAffectedFiles()` for planned files, `GitOps.getChangedFiles()` for actual. Cross-workstream comparison logic needed. |
| TEM-02 | Conflict detection warns when two workstreams have planned or actual changes to the same files | Severity classification (High/Medium) based on planned vs actual categorization. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI framework | Already used for all commands |
| chalk | ^4.1.2 | Terminal styling | Already used for output formatting |
| simple-git | ^3.27.0 | Git operations | Already used via GitOps class |
| vitest | ^3.0.0 | Testing | Already configured for project |

### Supporting (built-in Node.js)
| Module | Purpose | When to Use |
|--------|---------|-------------|
| node:readline | Interactive prompt for branch-switch | y/n confirmation without adding dependencies |
| fs/promises | File I/O | Reading meta.json, state.json, plan.md across workstreams |

### No New Dependencies Needed
This phase requires zero new npm packages. All functionality is achievable with existing dependencies and Node.js built-ins.

## Architecture Patterns

### Recommended Project Structure (new files)
```
src/
├── cli/
│   ├── status.ts           # branchos status command
│   ├── detect-conflicts.ts # branchos detect-conflicts command
│   ├── archive.ts          # branchos archive + unarchive commands
│   └── index.ts            # updated to register new commands
├── workstream/
│   ├── status.ts           # statusHandler logic (data gathering)
│   ├── conflicts.ts        # conflict detection logic
│   ├── archive.ts          # archive/unarchive logic
│   └── prompt.ts           # branch-switch prompt utility
tests/
├── cli/
│   ├── status.test.ts
│   ├── detect-conflicts.test.ts
│   └── archive.test.ts
├── workstream/
│   ├── status.test.ts
│   ├── conflicts.test.ts
│   ├── archive.test.ts
│   └── prompt.test.ts
```

### Pattern 1: Handler + Register Separation
**What:** Every CLI command exports a handler function (testable, takes options) and a register function (Commander wiring).
**When to use:** All new commands.
**Example:**
```typescript
// Established pattern from src/cli/check-drift.ts
export async function statusHandler(options: StatusOptions): Promise<StatusResult | null> {
  // Business logic here -- returns data or null on error
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show all active workstreams')
    .option('--all', 'Include archived workstreams', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      try {
        await statusHandler({ all: opts.all, json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
```

### Pattern 2: Cross-Workstream Data Gathering
**What:** Iterate all discovered workstreams, read their meta.json and state.json, filter by status.
**When to use:** Status command and conflict detection.
**Example:**
```typescript
import { discoverWorkstreams } from '../workstream/discover.js';
import { readMeta, WorkstreamMeta } from '../state/meta.js';
import { readState, WorkstreamState } from '../state/state.js';

interface WorkstreamInfo {
  id: string;
  meta: WorkstreamMeta;
  state: WorkstreamState;
}

async function gatherWorkstreams(
  workstreamsDir: string,
  includeArchived: boolean,
): Promise<WorkstreamInfo[]> {
  const ids = await discoverWorkstreams(workstreamsDir);
  const results: WorkstreamInfo[] = [];
  for (const id of ids) {
    const meta = await readMeta(join(workstreamsDir, id, 'meta.json'));
    if (!includeArchived && meta.status === 'archived') continue;
    const state = await readState(join(workstreamsDir, id, 'state.json'));
    results.push({ id, meta, state });
  }
  return results;
}
```

### Pattern 3: Branch-Switch Middleware
**What:** A shared utility that checks for workstream before running a workstream-scoped command.
**When to use:** Wrap workstream-scoped command handlers (discuss-phase, plan-phase, execute-phase, context, check-drift).
**Example:**
```typescript
import { createInterface } from 'readline';

export async function ensureWorkstream(
  repoRoot: string,
): Promise<{ id: string; path: string } | null> {
  const workstream = await resolveCurrentWorkstream(repoRoot);
  if (workstream) return workstream;

  const git = new GitOps(repoRoot);
  const branch = await git.getCurrentBranch();
  if (isProtectedBranch(branch)) return null;

  const confirmed = await promptYesNo(
    `No workstream for branch '${branch}'. Create one now? (y/n) `
  );
  if (!confirmed) {
    console.log('Workstream required for this command.');
    return null;
  }
  // Create inline and return
  const result = await createWorkstream({ repoRoot });
  return { id: result.workstreamId, path: result.path };
}
```

### Pattern 4: Conflict Detection with Severity
**What:** Compare file sets across workstreams, classify overlaps by severity.
**When to use:** detect-conflicts command.
**Example:**
```typescript
interface FileConflict {
  file: string;
  severity: 'high' | 'medium';
  workstreams: Array<{
    id: string;
    source: 'planned' | 'changed';
  }>;
}

function classifySeverity(
  sources: Array<{ source: 'planned' | 'changed' }>,
): 'high' | 'medium' {
  const allChanged = sources.every(s => s.source === 'changed');
  return allChanged ? 'high' : 'medium';
}
```

### Anti-Patterns to Avoid
- **Running git operations for every workstream**: For status command, use `meta.json updatedAt` for last activity -- do NOT call git log per workstream (user decision).
- **Hardcoding workstream-scoped command list**: Keep the list of commands that trigger branch-switch prompts in a constant or alongside the command registrations, not scattered.
- **Blocking on merge detection**: Checking if a branch is merged into a protected branch can fail if remote is not fetched. Use local refs only and handle errors gracefully.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive y/n prompt | Custom stdin reading | Node.js `readline.createInterface` | Handles TTY edge cases, cleanup, signal handling |
| Terminal table formatting | Manual string padding | `chalk` + manual column alignment with `String.padEnd()` | chalk is already a dependency; a table library would be overkill for one command |
| Git merge check | Raw git commands | `GitOps` wrapper (extend if needed) | Consistent error handling pattern |
| File-based conflict detection | Line-by-line diff parsing | `parseAffectedFiles()` + `GitOps.getChangedFiles()` | Already tested and working |

**Key insight:** This phase is 100% composition of existing primitives. The temptation is to add npm packages for tables or prompts -- resist it. The project has zero prompt/table dependencies and the use cases are simple enough for built-ins.

## Common Pitfalls

### Pitfall 1: Merge Detection Reliability
**What goes wrong:** Checking if a branch is merged using `git branch --merged` may not detect squash merges or merges into remote-only refs.
**Why it happens:** `git branch --merged` checks if the branch tip is an ancestor of HEAD, which fails for squash merges.
**How to avoid:** Use `git merge-base --is-ancestor <branch-tip> <protected-branch>` for ancestor check. Accept that squash merge detection is imperfect -- the `--force` flag exists for this reason.
**Warning signs:** Archive command warns but branch was actually merged via squash.

### Pitfall 2: Git Operations on Other Branches' Diffs
**What goes wrong:** `GitOps.getChangedFiles()` computes diff against HEAD, but conflict detection needs diffs for ALL workstreams, not just the current branch.
**Why it happens:** Each workstream is on a different branch. You cannot `git diff branch1..branch2` without those refs being available locally.
**How to avoid:** For each workstream, get the changed files by diffing the workstream's branch against its merge base with the protected branch. Need to extend GitOps or use raw git commands: `git diff --name-only $(git merge-base <ws-branch> <protected-branch>)..<ws-branch>`. If the branch doesn't exist locally, skip that workstream with a warning.
**Warning signs:** Empty file lists for workstreams on branches not currently checked out.

### Pitfall 3: Race Condition in Create-Then-Continue Flow
**What goes wrong:** Branch-switch prompt creates a workstream, then the original command runs, but the command re-resolves the workstream and may not find the newly created one.
**Why it happens:** Module caching or stale directory scans.
**How to avoid:** After creating the workstream inline, return the result directly to the calling command rather than re-scanning.

### Pitfall 4: Missing Plan Files for Conflict Detection
**What goes wrong:** A workstream may have no phases or no plan.md, causing `parseAffectedFiles()` to fail.
**Why it happens:** Workstreams in early stages have no plans yet.
**How to avoid:** Treat missing plan.md as "no planned files" (empty array), not an error. Only gather actual changed files via git diff.

### Pitfall 5: Interactive Prompt in Non-TTY Environments
**What goes wrong:** readline prompt hangs in CI/piped environments.
**Why it happens:** No TTY available for interactive input.
**How to avoid:** Check `process.stdin.isTTY` before prompting. In non-TTY mode, skip the prompt and print a message directing user to create a workstream manually.

## Code Examples

### Status Table Formatting
```typescript
// Using chalk + padEnd for simple table output
function formatStatusTable(
  rows: StatusRow[],
  currentBranch: string,
): string {
  const header = [
    ''.padEnd(2),
    'Workstream'.padEnd(24),
    'Branch'.padEnd(30),
    'Phase'.padEnd(20),
    'Last Activity'.padEnd(24),
    'Status',
  ].join('');

  const lines = rows.map(row => {
    const marker = row.branch === currentBranch ? '\u25b6 ' : '  ';
    const phase = row.currentPhase
      ? `Phase ${row.currentPhase.number} / ${row.currentStep}`
      : 'No phases';
    return [
      marker,
      row.id.padEnd(24),
      row.branch.padEnd(30),
      phase.padEnd(20),
      row.lastActivity.padEnd(24),
      row.status,
    ].join('');
  });

  return [chalk.bold(header), ...lines].join('\n');
}
```

### Interactive Prompt with readline
```typescript
import { createInterface } from 'readline';

export function promptYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}
```

### Extending GitOps for Cross-Branch Diffs
```typescript
// Add to GitOps class
async function getChangedFilesForBranch(
  branch: string,
  baseBranch: string,
): Promise<string[]> {
  try {
    const mergeBase = await this.git.raw(['merge-base', branch, baseBranch]);
    const result = await this.git.raw([
      'diff', '--name-only', mergeBase.trim() + '..' + branch,
    ]);
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// Check if branch is merged into another
async function isBranchMerged(
  branch: string,
  into: string,
): Promise<boolean> {
  try {
    await this.git.raw(['merge-base', '--is-ancestor', branch, into]);
    return true;
  } catch {
    return false;
  }
}
```

### Conflict Detection Core Logic
```typescript
interface WorkstreamFiles {
  id: string;
  planned: string[];
  changed: string[];
}

function detectConflicts(
  workstreams: WorkstreamFiles[],
): FileConflict[] {
  // Build file -> workstream mapping
  const fileMap = new Map<string, Array<{ id: string; source: 'planned' | 'changed' }>>();

  for (const ws of workstreams) {
    for (const f of ws.changed) {
      if (!fileMap.has(f)) fileMap.set(f, []);
      fileMap.get(f)!.push({ id: ws.id, source: 'changed' });
    }
    for (const f of ws.planned) {
      if (!fileMap.has(f)) fileMap.set(f, []);
      // Avoid duplicate if file is both planned and changed
      const existing = fileMap.get(f)!;
      if (!existing.some(e => e.id === ws.id)) {
        existing.push({ id: ws.id, source: 'planned' });
      }
    }
  }

  // Filter to files touched by 2+ workstreams
  const conflicts: FileConflict[] = [];
  for (const [file, entries] of fileMap) {
    const uniqueWs = new Set(entries.map(e => e.id));
    if (uniqueWs.size >= 2) {
      const allChanged = entries.every(e => e.source === 'changed');
      conflicts.push({
        file,
        severity: allChanged ? 'high' : 'medium',
        workstreams: entries,
      });
    }
  }

  return conflicts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return a.file.localeCompare(b.file);
  });
}
```

## State of the Art

No technology changes are relevant -- this phase uses only existing project dependencies and Node.js built-ins.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| inquirer for prompts | Node.js readline (no dependency) | N/A | Zero-dependency interactive prompts for simple y/n |

## Open Questions

1. **Squash merge detection**
   - What we know: `git merge-base --is-ancestor` works for standard merges but not squash merges
   - What's unclear: How common squash merges are in target workflows
   - Recommendation: Use ancestor check as best-effort. The `--force` flag and warning message handle the gap. Document this limitation.

2. **Git diff for non-checked-out branches**
   - What we know: `git diff --name-only $(git merge-base branchA branchB)..branchA` works if branchA ref exists locally
   - What's unclear: Whether users will have all workstream branches fetched locally
   - Recommendation: Skip workstreams whose branches are not available locally, with a warning message. This is a local-first tool.

3. **Which command gets the branch-switch prompt integration**
   - What we know: Five commands need it (discuss-phase, plan-phase, execute-phase, context, check-drift)
   - What's unclear: Whether to modify each command handler or add middleware in the CLI layer
   - Recommendation: Create a shared `ensureWorkstream()` utility. Each affected command handler calls it at the top. This is simpler than Commander middleware and keeps the pattern explicit.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WRK-03 | Status lists active workstreams with details | unit | `npx vitest run tests/workstream/status.test.ts -x` | No - Wave 0 |
| WRK-03 | Status CLI registers and runs | unit | `npx vitest run tests/cli/status.test.ts -x` | No - Wave 0 |
| WRK-04 | Archive sets status, warns on unmerged | unit | `npx vitest run tests/workstream/archive.test.ts -x` | No - Wave 0 |
| WRK-04 | Archive/unarchive CLI commands | unit | `npx vitest run tests/cli/archive.test.ts -x` | No - Wave 0 |
| WRK-05 | Branch-switch prompt creates workstream or exits | unit | `npx vitest run tests/workstream/prompt.test.ts -x` | No - Wave 0 |
| TEM-01 | Detect-conflicts finds file-level overlap | unit | `npx vitest run tests/workstream/conflicts.test.ts -x` | No - Wave 0 |
| TEM-01 | Detect-conflicts CLI registers and runs | unit | `npx vitest run tests/cli/detect-conflicts.test.ts -x` | No - Wave 0 |
| TEM-02 | Severity classification (high vs medium) | unit | `npx vitest run tests/workstream/conflicts.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + typecheck before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/workstream/status.test.ts` -- covers WRK-03 data gathering
- [ ] `tests/workstream/conflicts.test.ts` -- covers TEM-01, TEM-02
- [ ] `tests/workstream/archive.test.ts` -- covers WRK-04
- [ ] `tests/workstream/prompt.test.ts` -- covers WRK-05
- [ ] `tests/cli/status.test.ts` -- covers WRK-03 CLI
- [ ] `tests/cli/detect-conflicts.test.ts` -- covers TEM-01 CLI
- [ ] `tests/cli/archive.test.ts` -- covers WRK-04 CLI

## Sources

### Primary (HIGH confidence)
- Project source code: `src/cli/`, `src/workstream/`, `src/state/`, `src/phase/`, `src/git/`, `src/output/`, `src/constants.ts`
- Existing test patterns: `tests/cli/check-drift.test.ts` (handler + register test pattern)
- `package.json` -- confirmed dependencies and versions
- `tsconfig.json` -- confirmed TypeScript configuration

### Secondary (MEDIUM confidence)
- Node.js readline API -- verified from training data, stable API since Node.js 0.x

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already in project, no new packages needed
- Architecture: HIGH - extending well-established patterns with six prior command modules as templates
- Pitfalls: HIGH - identified from direct code analysis of GitOps capabilities and cross-workstream data flow
- Conflict detection logic: HIGH - straightforward set intersection with existing parseAffectedFiles() and getChangedFiles()

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies to go stale)
