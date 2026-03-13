# Phase 18: Create-PR Command & Assignee Sync - Research

**Researched:** 2026-03-13
**Domain:** GitHub CLI PR creation, slash command integration, assignee propagation
**Confidence:** HIGH

## Summary

Phase 18 implements two capabilities: (1) a `/branchos:create-pr` slash command that assembles a PR body from workstream artifacts and creates a GitHub PR via `gh pr create`, and (2) assignee propagation in `sync-issues` that reads workstream metadata to set GitHub Issue assignees via `gh issue edit --add-assignee`.

The implementation is well-constrained by existing patterns. PR creation follows the same `ghExec` + `execFile` pattern used by `createIssue` and `updateIssue`. The body assembly is a pure function that composes feature description, GWT checklist (via existing `formatGwtChecklist`), and `Closes #N` reference. The slash command follows the existing `.claude/commands/branchos:*.md` pattern. All gh CLI flags needed (`--body-file`, `--assignee`, `--base`, `--head`, `--add-assignee`) are confirmed available in the installed gh CLI.

**Primary recommendation:** Build a pure `assemblePrBody()` function in `src/github/pr.ts`, a `createPr()` function using `ghExec` with `--body-file` for the body, and add assignee scanning to `syncIssuesHandler`. The slash command delegates to the CLI, which orchestrates the flow with confirmation via stdout display.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PR body: minimal -- feature description + GWT acceptance criteria checklist + `Closes #N` (if issue linked). No phase summaries, no diff stats.
- PR title: Generated from feature title as `[F-03] Create-PR Command`. No editing.
- Feature link is required -- error and abort if no feature linked.
- Target branch: default to repo's default branch via `gh repo view --json defaultBranchRef`. No override flag.
- Confirmation: slash command displays title + body, AskUserQuestion with "Create PR" / "Cancel".
- Idempotency: check `gh pr list --head <branch> --json number,url` before creating.
- No commits ahead: error and abort.
- Branch not pushed: auto-push with `git push -u origin <branch>`.
- Null assignee at PR time: late capture fallback via `captureAssignee()`, silent if that also fails.
- ASN-03 sync-issues assignee: scan workstream meta files, match `featureId`, use `--add-assignee`, never remove, skip silently if no assignee found.
- PR body written via `--body-file` (not inline `--body`).

### Claude's Discretion
- PR body assembly function structure and location
- Exact error message wording for edge cases
- How to detect "no commits ahead" (git rev-list vs git log)
- Whether auto-push needs confirmation or is silent
- Test structure and mock patterns for gh CLI calls

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PR-01 | Developer can create a GitHub PR from workstream context via `/branchos:create-pr` | Slash command pattern from existing `branchos:context.md`; `ghExec` for `gh pr create` |
| PR-02 | PR body includes feature description from feature file | `readAllFeatures()` + feature body split at `## Acceptance Criteria` heading |
| PR-03 | PR body includes phase summaries | **OVERRIDDEN by CONTEXT.md** -- user decided NO phase summaries. Requirement satisfied by user decision to exclude. |
| PR-04 | PR body includes acceptance criteria as checkable GWT checklist | `formatGwtChecklist()` from `src/roadmap/gwt-parser.ts` -- reuse directly |
| PR-05 | PR body includes `Closes #N` linked issue reference when issue exists | Read `meta.issueNumber` from workstream meta |
| PR-06 | PR body includes branch diff stats | **OVERRIDDEN by CONTEXT.md** -- user decided NO diff stats. Requirement satisfied by user decision to exclude. |
| PR-07 | PR auto-assigned to workstream creator's GitHub username | `gh pr create --assignee <username>` with `meta.assignee` or `captureAssignee()` fallback |
| PR-08 | PR targets repo default branch (with override support) | `gh repo view --json defaultBranchRef` returns `{"defaultBranchRef":{"name":"main"}}`. No override per CONTEXT.md. |
| PR-09 | Confirmation flow shows assembled PR body before submitting | Slash command prints title+body, uses AskUserQuestion |
| PR-10 | Idempotency check prevents duplicate PRs for same branch | `gh pr list --head <branch> --json number,url` before creating |
| PR-11 | PR body written via `--body-file` (not inline `--body`) | Follows `createIssue` pattern: temp file + `--body-file` + cleanup in finally |
| ASN-03 | `sync-issues` sets assignee on GitHub Issues from workstream assignee | `gh issue edit <N> --add-assignee <login>` -- add-only, scan workstream metas |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gh CLI | 2.x | PR creation, issue editing, repo queries | Already used throughout project for all GitHub operations |
| simple-git | ^3.27.0 | Git operations (branch detection, push, rev-list) | Already in dependencies, used by `GitOps` class |
| commander | ^12.1.0 | CLI command registration | Already in dependencies, standard pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.0.0 | Unit testing with `vi.mock` | All test files follow this pattern |
| node:fs | built-in | Temp file for `--body-file`, workstream meta scanning | `writeFileSync`/`unlinkSync` for temp files, `readdir` for scanning |
| node:os | built-in | `tmpdir()` for temp file location | Same as `createIssue` pattern |

### Alternatives Considered
None -- all decisions locked by CONTEXT.md. No new dependencies needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── github/
│   ├── index.ts          # ghExec, captureAssignee, checkGhAvailable (existing)
│   ├── issues.ts         # createIssue, updateIssue, fetchIssue (existing -- add assignee support)
│   └── pr.ts             # NEW: assemblePrBody, createPr, checkExistingPr
├── cli/
│   ├── sync-issues.ts    # MODIFY: add assignee propagation in syncIssuesHandler
│   └── create-pr.ts      # NEW: createPrHandler, registerCreatePrCommand
├── git/
│   └── index.ts          # MODIFY: add push(), getCommitsAheadOfBase(), getDefaultBranch() methods
└── state/
    └── meta.ts           # readMeta (existing, unchanged)

.claude/commands/
└── branchos:create-pr.md # NEW: slash command definition
```

### Pattern 1: Pure Body Assembly
**What:** `assemblePrBody()` takes feature data and issue number, returns markdown string. No I/O.
**When to use:** Always for PR body generation -- enables easy testing.
**Example:**
```typescript
// src/github/pr.ts
export interface PrBodyInput {
  featureId: string;
  featureTitle: string;
  featureDescription: string;   // body text before ## Acceptance Criteria
  parsedCriteria: ParsedAcceptanceCriteria;
  issueNumber: number | null;
}

export function assemblePrBody(input: PrBodyInput): string {
  const lines: string[] = [];

  // Feature description
  if (input.featureDescription.trim()) {
    lines.push(input.featureDescription.trim());
    lines.push('');
  }

  // GWT checklist
  const checklist = formatGwtChecklist(input.parsedCriteria);
  if (checklist.trim()) {
    lines.push(checklist);
    lines.push('');
  }

  // Closes #N
  if (input.issueNumber !== null) {
    lines.push(`Closes #${input.issueNumber}`);
  }

  return lines.join('\n');
}
```

### Pattern 2: Temp File Body (from createIssue)
**What:** Write body to temp file, pass via `--body-file`, clean up in `finally`.
**When to use:** Always for PR body (per CONTEXT.md decision).
**Example:**
```typescript
// Follows exact pattern from createIssue in src/github/issues.ts
const tempFile = join(tmpdir(), `branchos-pr-body-${Date.now()}.md`);
writeFileSync(tempFile, body, 'utf-8');
try {
  const args = ['pr', 'create', '--title', title, '--body-file', tempFile, '--base', baseBranch];
  if (assignee) args.push('--assignee', assignee);
  const url = await ghExec(args);
  return url;
} finally {
  try { unlinkSync(tempFile); } catch { /* ignore */ }
}
```

### Pattern 3: Idempotency Check
**What:** Query `gh pr list --head <branch>` before creating.
**When to use:** Before every PR creation attempt.
**Example:**
```typescript
export async function checkExistingPr(headBranch: string): Promise<{ number: number; url: string } | null> {
  const raw = await ghExec(['pr', 'list', '--head', headBranch, '--json', 'number,url']);
  const prs = JSON.parse(raw);
  if (prs.length > 0) {
    return { number: prs[0].number, url: prs[0].url };
  }
  return null;
}
```

### Pattern 4: Workstream Meta Scanning for Assignee Sync
**What:** Read all workstream `meta.json` files, match by `featureId`, extract `assignee`.
**When to use:** In sync-issues when processing each feature that has an issue number.
**Example:**
```typescript
// In syncIssuesHandler, after issue create/update loop
async function findAssigneeForFeature(
  repoRoot: string,
  featureId: string,
): Promise<string | null> {
  const wsDir = join(repoRoot, '.branchos', 'workstreams');
  let entries: string[];
  try { entries = await readdir(wsDir); } catch { return null; }
  entries.sort(); // alphabetical for deterministic "first active" pick
  for (const entry of entries) {
    const metaPath = join(wsDir, entry, 'meta.json');
    try {
      const meta = await readMeta(metaPath);
      if (meta.featureId === featureId && meta.status === 'active' && meta.assignee) {
        return meta.assignee;
      }
    } catch { continue; }
  }
  return null;
}
```

### Pattern 5: Slash Command Definition
**What:** Markdown file in `.claude/commands/` that shells out to `npx branchos create-pr`.
**When to use:** For the `/branchos:create-pr` command.
**Example:**
```markdown
---
description: Create a GitHub PR from workstream context
allowed-tools: Bash(npx branchos *), AskUserQuestion
---
# Create PR
Run the following command to assemble and create a PR:
\```bash
npx branchos create-pr $ARGUMENTS
\```
$ARGUMENTS
```

### Anti-Patterns to Avoid
- **Inline `--body` for PR creation:** Use `--body-file` always. Large bodies can exceed shell argument limits or cause escaping issues.
- **Removing existing assignees in sync-issues:** Use `--add-assignee` only, never `--remove-assignee`. Other teams may have added assignees manually.
- **Blocking on missing assignee:** If `captureAssignee()` returns null at PR time, create PR without assignee silently -- do not error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GWT formatting | Custom checklist formatter | `formatGwtChecklist()` from gwt-parser.ts | Already handles all edge cases (And-continuation, freeform, mixed mode) |
| GitHub API calls | HTTP requests to GitHub API | `gh` CLI via `ghExec()` | Auth, pagination, error handling already solved |
| Assignee capture | Manual `git config` or env var parsing | `captureAssignee()` from github/index.ts | Three-tier fallback already implemented |
| Feature body parsing | Regex on feature markdown | `parseAcceptanceCriteria()` + body split at `## Acceptance Criteria` | Already handles all formats |
| Temp file cleanup | Manual try/catch | Follow `createIssue` finally-block pattern | Proven pattern in codebase |

## Common Pitfalls

### Pitfall 1: Shell Argument Length Limits
**What goes wrong:** Passing large PR bodies via `--body` flag hits OS argument length limits.
**Why it happens:** Feature descriptions + GWT checklists can be many KB.
**How to avoid:** Always use `--body-file` with temp file. Already decided in CONTEXT.md.
**Warning signs:** `E2BIG` errors or truncated PR bodies.

### Pitfall 2: Race Condition on Idempotency Check
**What goes wrong:** Two users run `create-pr` simultaneously, both pass the check, both create PRs.
**Why it happens:** `gh pr list` check and `gh pr create` are not atomic.
**How to avoid:** Accept this as extremely unlikely in practice. The second `gh pr create` will succeed but create a duplicate -- not a data loss scenario. Could catch and warn.
**Warning signs:** Two open PRs for the same branch.

### Pitfall 3: Feature Body Without Acceptance Criteria Section
**What goes wrong:** `parseAcceptanceCriteria()` returns empty when no `## Acceptance Criteria` heading exists.
**Why it happens:** Older or manually-created feature files may lack the heading.
**How to avoid:** Handle empty `ParsedAcceptanceCriteria` gracefully -- just omit the checklist section from PR body. The body still works with just the description.
**Warning signs:** PR body is very short (only description + Closes #N).

### Pitfall 4: Branch Not Tracking Remote
**What goes wrong:** `git push -u origin <branch>` fails if origin doesn't exist or branch name conflicts.
**Why it happens:** User may have a different remote name or the branch may already exist remotely with divergent history.
**How to avoid:** Use `git push -u origin HEAD` which pushes current branch regardless of tracking. On failure, show clear error message.
**Warning signs:** Push errors mentioning "rejected" or "non-fast-forward".

### Pitfall 5: Default Branch Detection Failure
**What goes wrong:** `gh repo view --json defaultBranchRef` fails if not in a GitHub repo or gh not authenticated.
**Why it happens:** Could be a local-only repo or the gh auth token expired.
**How to avoid:** Pre-flight `checkGhAvailable()` (already in project), then wrap `gh repo view` call with clear error messaging.
**Warning signs:** JSON parse error or empty response.

### Pitfall 6: Commits-Ahead Check With Detached HEAD
**What goes wrong:** `git rev-list` may not work as expected when HEAD is detached.
**Why it happens:** User checked out a specific commit instead of a branch.
**How to avoid:** Use `GitOps.getCurrentBranch()` first -- it already throws on detached HEAD. This pre-flight check prevents the issue.
**Warning signs:** Error message about detached HEAD from `getCurrentBranch()`.

## Code Examples

### Detecting Commits Ahead of Base Branch
```typescript
// Recommendation: use git rev-list --count
// GitOps already has getCommitsBehind() which does rev-list --count
// For "commits ahead", the logic is:
//   git rev-list --count <baseBranch>..HEAD
// This is the same as getCommitsBehind but with reversed refs.
// Add a method to GitOps:

async getCommitsAhead(baseBranch: string): Promise<number> {
  try {
    const result = await this.git.raw(['rev-list', '--count', baseBranch + '..HEAD']);
    return parseInt(result.trim(), 10);
  } catch {
    return -1;  // error case
  }
}
```

### gh pr create Full Command
```typescript
// Verified flags from gh pr create --help:
// --title, --body-file, --base, --assignee, --head
const args = [
  'pr', 'create',
  '--title', `[${featureId}] ${featureTitle}`,
  '--body-file', tempFile,
  '--base', defaultBranch,
];
if (assignee) {
  args.push('--assignee', assignee);
}
// gh pr create returns the PR URL on stdout
const url = await ghExec(args);
```

### gh pr list for Idempotency
```typescript
// Verified: gh pr list --head <branch> --json number,url
// Returns JSON array. Empty array if no matching PR.
const raw = await ghExec(['pr', 'list', '--head', branch, '--json', 'number,url']);
const prs = JSON.parse(raw);
// prs = [{"number": 42, "url": "https://github.com/..."}] or []
```

### gh issue edit for Assignee Sync
```typescript
// Verified: gh issue edit <number> --add-assignee <login>
// --add-assignee is add-only; does not remove existing assignees
await ghExec(['issue', 'edit', String(issueNumber), '--add-assignee', assignee]);
```

### gh repo view for Default Branch
```typescript
// Verified output: {"defaultBranchRef":{"name":"main"}}
const raw = await ghExec(['repo', 'view', '--json', 'defaultBranchRef']);
const data = JSON.parse(raw);
const defaultBranch = data.defaultBranchRef.name;
```

### Git Push (auto-push when branch not on remote)
```typescript
// Using simple-git via GitOps pattern
// Add to GitOps class:
async push(remote: string = 'origin', setUpstream: boolean = true): Promise<void> {
  const args = ['push'];
  if (setUpstream) args.push('-u');
  args.push(remote, 'HEAD');
  await this.git.raw(args);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--body` inline | `--body-file` temp file | Already used in createIssue | Avoids shell limits, escaping issues |
| Manual assignee tracking | Auto-captured on workstream creation | Phase 16 | Assignee available in meta.json for PR and sync |
| Freeform acceptance criteria | GWT structured format | Phase 15 | Checklist rendering via formatGwtChecklist |

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
| PR-01 | create-pr handler creates PR via gh CLI | unit | `npx vitest run tests/cli/create-pr.test.ts -x` | No -- Wave 0 |
| PR-02 | PR body includes feature description | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| PR-03 | (Overridden -- no phase summaries) | N/A | N/A | N/A |
| PR-04 | PR body includes GWT checklist | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| PR-05 | PR body includes Closes #N when issue exists | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| PR-06 | (Overridden -- no diff stats) | N/A | N/A | N/A |
| PR-07 | PR assigned to workstream assignee | unit | `npx vitest run tests/cli/create-pr.test.ts -x` | No -- Wave 0 |
| PR-08 | PR targets default branch | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| PR-09 | Confirmation flow displays body | unit | `npx vitest run tests/cli/create-pr.test.ts -x` | No -- Wave 0 |
| PR-10 | Idempotency prevents duplicate PRs | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| PR-11 | Body via --body-file temp file | unit | `npx vitest run tests/github/pr.test.ts -x` | No -- Wave 0 |
| ASN-03 | sync-issues adds assignees from workstream meta | unit | `npx vitest run tests/cli/sync-issues.test.ts -x` | Partial -- file exists but needs new tests |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/github/pr.test.ts tests/cli/create-pr.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/github/pr.test.ts` -- covers PR-02, PR-04, PR-05, PR-08, PR-10, PR-11 (assemblePrBody, createPr, checkExistingPr)
- [ ] `tests/cli/create-pr.test.ts` -- covers PR-01, PR-07, PR-09 (createPrHandler integration)
- [ ] New tests in `tests/cli/sync-issues.test.ts` -- covers ASN-03 (assignee propagation)
- [ ] No new framework install needed -- vitest already configured

## Open Questions

1. **Auto-push confirmation vs silent**
   - What we know: CONTEXT.md says auto-push with `git push -u origin <branch>` but leaves confirmation behavior to discretion.
   - Recommendation: Silent push. The user already confirmed PR creation, and pushing is a prerequisite. Adding another confirmation step is friction without value. Log the push action to stdout.

2. **Commits-ahead detection method**
   - What we know: `git rev-list --count <base>..HEAD` is the standard approach. GitOps already has `getCommitsBehind` doing exactly this in reverse.
   - Recommendation: Use `git rev-list --count` via a new `getCommitsAhead()` method on GitOps. Returns 0 means "no commits ahead" which triggers the abort. Returns -1 means detection failed (proceed anyway, let gh handle it).

3. **PR number storage in meta.json**
   - What we know: Not in CONTEXT.md decisions, not in current requirements.
   - Recommendation: Out of scope for now. Future PRL-02 requirement covers PR status tracking.

## Sources

### Primary (HIGH confidence)
- `gh pr create --help` -- verified all flags: `--title`, `--body-file`, `--base`, `--assignee`
- `gh pr list --help` -- verified `--head` flag and `--json number,url` output
- `gh issue edit --help` -- verified `--add-assignee` flag (add-only semantics confirmed)
- `gh repo view --json defaultBranchRef` -- verified output format `{"defaultBranchRef":{"name":"main"}}`
- Source code: `src/github/issues.ts` -- `createIssue` temp file + `--body-file` pattern
- Source code: `src/github/index.ts` -- `ghExec`, `captureAssignee`, `checkGhAvailable`
- Source code: `src/roadmap/gwt-parser.ts` -- `formatGwtChecklist`, `parseAcceptanceCriteria`
- Source code: `src/state/meta.ts` -- `WorkstreamMeta` interface, `readMeta`
- Source code: `src/git/index.ts` -- `GitOps` class methods
- Source code: `src/cli/sync-issues.ts` -- `syncIssuesHandler` flow
- Source code: `tests/github/index.test.ts` -- mock patterns for `execFile`/`ghExec`

### Secondary (MEDIUM confidence)
- None needed -- all research verified against local source code and gh CLI help output.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, no new dependencies
- Architecture: HIGH -- follows established patterns from createIssue, syncIssuesHandler, existing slash commands
- Pitfalls: HIGH -- verified against real gh CLI behavior and existing codebase patterns

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- no fast-moving dependencies)
