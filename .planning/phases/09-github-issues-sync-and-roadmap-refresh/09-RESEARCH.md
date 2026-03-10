# Phase 9: GitHub Issues Sync and Roadmap Refresh - Research

**Researched:** 2026-03-10
**Domain:** GitHub CLI integration, idempotent sync, roadmap diffing
**Confidence:** HIGH

## Summary

Phase 9 adds two commands: `sync-issues` (push features to GitHub Issues via `gh` CLI) and `refresh-roadmap` (update roadmap when PR-FAQ evolves). Both build on solid existing infrastructure -- `FeatureFrontmatter` already has an `issue: number | null` field, `readAllFeatures()`/`writeFeatureFile()` handle feature CRUD, and the ingest-prfaq handler demonstrates the hash-based change detection and confirmation patterns.

The `gh` CLI provides all needed primitives: `gh issue create` (returns URL with issue number), `gh issue edit` (update body/labels/milestone), `gh label create --force` (idempotent label creation), and `gh api` for milestone management (no native milestone command exists). The main technical challenges are: (1) parsing issue numbers from `gh issue create` stdout URLs, (2) managing milestones via `gh api` since there is no `gh milestone` command, and (3) implementing title similarity matching for roadmap refresh without adding dependencies.

**Primary recommendation:** Shell out to `gh` CLI via `child_process.execFile` (not `exec`) for safety. Use `gh label create --force` for idempotent label management. Use `gh api` REST endpoints for milestone CRUD. Implement a simple normalized Levenshtein-based similarity score for title matching during refresh.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Issue title = feature title, issue body = full feature file markdown content (description + acceptance criteria)
- Auto-create GitHub milestones from roadmap milestones; assign each issue to its milestone
- Add a status label matching feature status (e.g., "unassigned", "in-progress"); create labels if they don't exist
- Include dependency info in issue body: "Depends on: #42 (F-003)" linking to the dependency's issue number
- Feature file is source of truth -- re-sync always overwrites issue body with latest feature file content
- Re-sync updates status labels to match current feature status (removes old label, adds new one)
- Skip features with status 'complete' -- don't create or update issues for done work
- Orphaned issues (issue exists but feature removed): warn in sync output but don't auto-close
- Match new features to existing ones by title similarity; matched features keep ID, status, issue number, workstream link
- Only body/acceptance criteria get updated on matched features; new features get new sequential IDs
- Show summary of proposed changes (N updated, M new, K dropped) and require user confirmation before writing
- Features no longer implied by updated PR-FAQ get status 'dropped' -- file kept but excluded from active listings and issue sync
- Auto re-ingest: refresh reads latest PR-FAQ.md directly, updates stored copy and hash, then proceeds with roadmap changes
- Fail fast with clear guidance: check for `gh` before doing anything; error messages include install/auth instructions
- Support `--dry-run` flag for previewing what would be created/updated without making API calls
- Sequential issue creation with basic retry on rate limit (one at a time, retry once if rate-limited)
- Summary output with links: table of issue numbers and URLs after sync, counts of created/updated/skipped; `--json` flag for machine-readable output

### Claude's Discretion
- Exact title similarity matching algorithm for refresh
- GitHub milestone creation strategy (create-if-not-exists vs always recreate)
- Retry delay timing for rate limits
- Commit message format for feature file updates after sync
- How to handle `--force` flag interactions

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GHIS-01 | User can create GitHub Issues from features via `/branchos:sync-issues` using `gh` CLI | `gh issue create` with `--title`, `--body`, `--label`, `--milestone` flags; `gh issue edit` for updates; `gh api` for milestones |
| GHIS-02 | Sync is idempotent -- re-running updates existing issues, stores issue number in frontmatter | `FeatureFrontmatter.issue` field exists; `gh issue edit` updates body/labels; `writeFeatureFile()` persists issue numbers |
| ROAD-04 | User can refresh roadmap when PR-FAQ changes via `/branchos:refresh-roadmap` | `readMeta()`/`hashContent()` for change detection; `readAllFeatures()` for current state; Levenshtein similarity for title matching |
| ROAD-05 | Roadmap refresh preserves manual edits to feature files where possible | Match by title similarity preserving ID/status/issue/workstream; only body/acceptance criteria updated on matched features |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `child_process` (Node built-in) | N/A | Execute `gh` CLI commands | No npm dependency needed; `execFile` is safer than `exec` (no shell injection) |
| `gh` CLI | >=2.0 | GitHub Issues, labels, milestones | Project decision: use `gh` not GitHub REST API directly |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `commander` | ^12.1.0 | CLI command registration | Already in project; `registerXxxCommand(program)` pattern |
| `simple-git` (via `GitOps`) | ^3.27.0 | Auto-commit after sync | Already in project; `addAndCommit()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `child_process.execFile` | `@octokit/rest` | Would add dependency; project decision is to use `gh` CLI |
| Hand-rolled Levenshtein | `string-similarity` npm | Adding dependency for ~20 lines of code not worth it |
| `gh api` for milestones | `gh milestone` command | `gh milestone` does not exist as a native command |

**No new npm dependencies required.** Everything uses Node built-ins and existing project deps.

## Architecture Patterns

### Recommended Project Structure
```
src/
  github/
    index.ts           # gh CLI wrapper: exec, auth check, rate limit retry
    issues.ts           # createIssue, updateIssue, listIssues
    milestones.ts       # ensureMilestone (create-if-not-exists)
    labels.ts           # ensureLabel (gh label create --force)
  cli/
    sync-issues.ts      # syncIssuesHandler + registerSyncIssuesCommand
    refresh-roadmap.ts  # refreshRoadmapHandler + registerRefreshRoadmapCommand
  roadmap/
    types.ts            # Add 'dropped' to FEATURE_STATUSES
    similarity.ts       # Title similarity matching (Levenshtein-based)
```

### Pattern 1: gh CLI Wrapper
**What:** Thin wrapper around `child_process.execFile('gh', [...args])` with error handling
**When to use:** All GitHub interactions
**Example:**
```typescript
// src/github/index.ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function ghExec(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('gh', args);
  return stdout.trim();
}

export async function checkGhAvailable(): Promise<{ available: boolean; authenticated: boolean }> {
  try {
    await execFileAsync('gh', ['--version']);
  } catch {
    return { available: false, authenticated: false };
  }
  try {
    await execFileAsync('gh', ['auth', 'status']);
    return { available: true, authenticated: true };
  } catch {
    return { available: true, authenticated: false };
  }
}
```

### Pattern 2: Issue Create with Number Extraction
**What:** `gh issue create` outputs the issue URL to stdout (e.g., `https://github.com/owner/repo/issues/42`). Parse the number from the URL.
**When to use:** Creating new issues
**Example:**
```typescript
export async function createIssue(opts: {
  title: string;
  body: string;
  labels: string[];
  milestone?: string;
}): Promise<{ number: number; url: string }> {
  const args = ['issue', 'create', '--title', opts.title, '--body', opts.body];
  for (const label of opts.labels) {
    args.push('--label', label);
  }
  if (opts.milestone) {
    args.push('--milestone', opts.milestone);
  }
  const url = await ghExec(args);
  const number = parseInt(url.split('/').pop()!, 10);
  return { number, url };
}
```

### Pattern 3: Idempotent Label Creation
**What:** Use `gh label create --force` which creates or updates without error
**When to use:** Ensuring status labels exist before issue sync
**Example:**
```typescript
const STATUS_LABEL_COLOR: Record<string, string> = {
  'unassigned': 'CCCCCC',
  'assigned': '0E8A16',
  'in-progress': 'FBCA04',
  'dropped': 'D93F0B',
};

export async function ensureLabel(name: string, color: string): Promise<void> {
  await ghExec(['label', 'create', name, '--color', color, '--force']);
}
```

### Pattern 4: Milestone via gh api
**What:** No native `gh milestone` command; use REST API through `gh api`
**When to use:** Creating milestones for issue assignment
**Example:**
```typescript
export async function ensureMilestone(title: string): Promise<void> {
  // List existing milestones
  const existing = await ghExec([
    'api', 'repos/{owner}/{repo}/milestones', '--jq', '.[].title'
  ]);
  if (existing.split('\n').includes(title)) return;
  // Create new milestone
  await ghExec([
    'api', '--method', 'POST', 'repos/{owner}/{repo}/milestones',
    '-f', `title=${title}`, '-f', 'state=open'
  ]);
}
```

### Pattern 5: Title Similarity for Refresh
**What:** Normalized Levenshtein distance for matching old features to new features by title
**When to use:** Roadmap refresh -- determining which features are "the same" vs new
**Example:**
```typescript
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

export function titleSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

// Threshold: 0.6+ is a match (allows moderate title edits)
```

### Anti-Patterns to Avoid
- **Using `child_process.exec` with string interpolation:** Shell injection risk with feature titles containing special characters. Always use `execFile` with args array.
- **Parallel issue creation:** GitHub rate limits will bite. Sequential with retry is the project decision.
- **Storing milestone numbers in feature files:** Milestones are looked up by title; no need to persist their GitHub-side IDs.
- **Auto-closing orphaned issues:** Project decision says warn only, never auto-close.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub API auth | OAuth token management | `gh auth status` | Already handles token storage, SSO, etc. |
| Issue CRUD | HTTP client + GitHub REST | `gh issue create/edit` | Handles auth, pagination, error messages |
| Label management | REST API calls | `gh label create --force` | Idempotent out of the box |
| YAML frontmatter | Custom parser | Existing `parseFrontmatter()`/`stringifyFrontmatter()` | Already handles all edge cases |
| User confirmation | readline wrapper | Existing `promptYesNo()` from `src/workstream/prompt.ts` | Already handles non-TTY gracefully |

**Key insight:** The `gh` CLI handles all the hard parts (auth, rate limiting responses, error formatting). Wrap it thinly, don't abstract it away.

## Common Pitfalls

### Pitfall 1: Shell Injection via Feature Titles
**What goes wrong:** Feature titles containing quotes, backticks, or `$()` can execute arbitrary commands if passed through `exec()`.
**Why it happens:** Using string template with `exec` instead of `execFile` with args array.
**How to avoid:** Always use `execFile('gh', ['issue', 'create', '--title', title])` -- args are never shell-interpreted.
**Warning signs:** Any use of `exec()` or backtick template strings for gh commands.

### Pitfall 2: Rate Limiting on Bulk Issue Creation
**What goes wrong:** Creating 20+ issues sequentially may hit GitHub's secondary rate limits (anti-abuse).
**Why it happens:** GitHub has both primary (5000 req/hr) and secondary (rapid-fire detection) rate limits.
**How to avoid:** Sequential creation with a small delay (500ms between calls). Retry once on 403/429 with exponential backoff (2-5 seconds).
**Warning signs:** HTTP 403 responses with `retry-after` header.

### Pitfall 3: gh issue create URL Parsing Fragility
**What goes wrong:** Expecting `gh issue create` to always return a clean URL, but error messages or warnings may be mixed in.
**Why it happens:** gh may print warnings to stderr but URL to stdout. Using `execFile` correctly separates these.
**How to avoid:** Use `execFile` which gives separate `stdout` and `stderr`. Parse only stdout for the URL.
**Warning signs:** Issue number parsed as NaN.

### Pitfall 4: Stale Issue Numbers After Feature File Rename
**What goes wrong:** If a feature file is renamed (e.g., slug changes), `readAllFeatures()` reads it fine but the filename changes.
**Why it happens:** Feature files use `F-NNN-slug.md` naming; slug comes from title.
**How to avoid:** During refresh, when a matched feature's title changes, keep the original filename (don't regenerate slug). The feature ID is the stable identifier, not the filename.
**Warning signs:** Duplicate feature files appearing after refresh.

### Pitfall 5: Body Truncation in gh issue create
**What goes wrong:** Very long feature bodies may exceed shell argument limits.
**Why it happens:** `execFile` has argument length limits; feature files with extensive acceptance criteria can be long.
**How to avoid:** Use `--body-file` with a temp file instead of `--body` for large bodies, or pipe stdin. A safe threshold is ~64KB.
**Warning signs:** E2BIG errors from execFile.

### Pitfall 6: Label Removal During Status Transition
**What goes wrong:** Feature changes from "unassigned" to "in-progress" but old label remains on issue.
**Why it happens:** `gh issue edit --add-label` does not remove old labels automatically.
**How to avoid:** Use both `--remove-label` (old status) and `--add-label` (new status) in the edit command. Need to know the previous label, which can be read from the issue or inferred from the feature's previous sync state.
**Warning signs:** Issues accumulating multiple status labels.

## Code Examples

Verified patterns from the existing codebase:

### Handler Pattern (follows plan-roadmap.ts)
```typescript
// src/cli/sync-issues.ts
export interface SyncIssuesOptions {
  json: boolean;
  dryRun: boolean;
  force: boolean;
  cwd?: string;
}

export interface SyncIssuesResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  issues: Array<{ featureId: string; issueNumber: number; url: string; action: string }>;
  warnings: string[];
  error?: string;
}

export async function syncIssuesHandler(options: SyncIssuesOptions): Promise<SyncIssuesResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);
  // ... validation, gh check, read features, sync loop, commit
}
```

### Refresh Handler Pattern
```typescript
// src/cli/refresh-roadmap.ts
export interface RefreshRoadmapOptions {
  json: boolean;
  force: boolean;
  cwd?: string;
  roadmapData?: RoadmapData;  // From slash command (same as plan-roadmap)
}

export interface RefreshRoadmapResult {
  success: boolean;
  updated: number;
  added: number;
  dropped: number;
  error?: string;
}
```

### Adding 'dropped' to FEATURE_STATUSES
```typescript
// src/roadmap/types.ts -- extend the array
export const FEATURE_STATUSES = [
  'unassigned',
  'assigned',
  'in-progress',
  'complete',
  'dropped',       // New: features removed during roadmap refresh
] as const;
```

### Dependency Info in Issue Body
```typescript
function buildIssueBody(feature: Feature, allFeatures: Feature[]): string {
  let body = feature.body;
  if (feature.dependsOn && feature.dependsOn.length > 0) {
    const depLines = feature.dependsOn.map(depId => {
      const dep = allFeatures.find(f => f.id === depId);
      const issueRef = dep?.issue ? `#${dep.issue}` : 'no issue yet';
      return `- ${issueRef} (${depId})`;
    });
    body += '\n\n## Dependencies\n\n' + depLines.join('\n');
  }
  return body;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gh api` for all operations | `gh issue create/edit` + `gh label create` | gh CLI 2.0+ | Native commands are simpler than raw API |
| No native label management | `gh label create --force` | gh CLI 2.4+ | Idempotent label creation built-in |
| Manual milestone management | Still `gh api` (no native command) | Current | Must use REST API via `gh api` for milestones |

**Deprecated/outdated:**
- `gh issue create` does NOT support `--json` output format (open feature request cli/cli#11196). Parse URL from stdout instead.

## Open Questions

1. **Rate limit retry delay timing**
   - What we know: GitHub secondary rate limits trigger on rapid-fire requests; primary limit is 5000/hr
   - What's unclear: Optimal delay between sequential issue creations
   - Recommendation: 500ms base delay between creates; on 403/429, wait 3 seconds and retry once. This is Claude's discretion per CONTEXT.md.

2. **Milestone creation strategy**
   - What we know: `gh api` can list and create milestones; `gh issue create --milestone` expects milestone to exist
   - What's unclear: Whether to check-then-create or always attempt create and handle conflict
   - Recommendation: List milestones once at start, create missing ones. Cache the list for the sync session. This avoids race conditions and is simpler.

3. **Body size limits**
   - What we know: `execFile` has OS-level arg limits (~128KB on macOS, ~2MB on Linux)
   - What's unclear: Whether any feature bodies will approach these limits in practice
   - Recommendation: Use `--body` for bodies under 32KB, fall back to `--body-file` with temp file for larger. Most feature files will be well under 32KB.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/cli/sync-issues.test.ts tests/cli/refresh-roadmap.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GHIS-01 | sync-issues creates GitHub issues from features | unit (mock gh) | `npx vitest run tests/cli/sync-issues.test.ts -x` | No -- Wave 0 |
| GHIS-02 | Re-sync updates existing issues, stores issue number | unit (mock gh) | `npx vitest run tests/cli/sync-issues.test.ts -x` | No -- Wave 0 |
| ROAD-04 | refresh-roadmap proposes changes from updated PR-FAQ | unit | `npx vitest run tests/cli/refresh-roadmap.test.ts -x` | No -- Wave 0 |
| ROAD-05 | Refresh preserves manual edits to feature files | unit | `npx vitest run tests/cli/refresh-roadmap.test.ts -x` | No -- Wave 0 |
| N/A | Title similarity matching | unit | `npx vitest run tests/roadmap/similarity.test.ts -x` | No -- Wave 0 |
| N/A | gh CLI wrapper (auth check, exec) | unit (mock execFile) | `npx vitest run tests/github/index.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/cli/sync-issues.test.ts tests/cli/refresh-roadmap.test.ts tests/roadmap/similarity.test.ts tests/github/index.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/cli/sync-issues.test.ts` -- covers GHIS-01, GHIS-02
- [ ] `tests/cli/refresh-roadmap.test.ts` -- covers ROAD-04, ROAD-05
- [ ] `tests/roadmap/similarity.test.ts` -- covers title matching logic
- [ ] `tests/github/index.test.ts` -- covers gh CLI wrapper, auth check

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/roadmap/types.ts`, `src/roadmap/feature-file.ts`, `src/cli/plan-roadmap.ts`, `src/cli/ingest-prfaq.ts` -- patterns, types, established conventions
- [gh issue create manual](https://cli.github.com/manual/gh_issue_create) -- flags: `--title`, `--body`, `--body-file`, `--label`, `--milestone`
- [gh issue edit manual](https://cli.github.com/manual/gh_issue_edit) -- flags: `--title`, `--body`, `--add-label`, `--remove-label`, `--milestone`
- [gh label create manual](https://cli.github.com/manual/gh_label_create) -- `--force` flag for idempotent create/update
- [gh auth status manual](https://cli.github.com/manual/gh_auth_status) -- auth verification

### Secondary (MEDIUM confidence)
- [Milestone management via gh api](https://gist.github.com/doi-t/5735f9f0f7f8b7664aa6739bc810a2cc) -- REST endpoints for milestone CRUD
- [gh issue create lacks --json](https://github.com/cli/cli/issues/11196) -- confirms URL parsing is needed
- [Levenshtein distance in JS](https://www.30secondsofcode.org/js/s/levenshtein-distance/) -- algorithm reference

### Tertiary (LOW confidence)
- Rate limit timing (500ms delay, 3s retry) -- based on general GitHub API knowledge, not measured

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns from existing codebase
- Architecture: HIGH -- follows established handler/register pattern; `gh` CLI API well-documented
- Pitfalls: HIGH -- shell injection, rate limits, URL parsing are well-known issues
- Similarity matching: MEDIUM -- Levenshtein is standard but threshold (0.6) needs tuning during implementation

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain, gh CLI changes rarely)
