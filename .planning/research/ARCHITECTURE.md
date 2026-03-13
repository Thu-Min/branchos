# Architecture Patterns

**Domain:** PR workflow and developer experience features for existing CLI tool
**Researched:** 2026-03-13
**Confidence:** HIGH (based on direct codebase analysis of v2.1 architecture)

## Recommended Architecture

The 4 new features (create-pr, GWT acceptance criteria, issue-linked workstreams, automatic assignees) integrate into the existing two-layer architecture without structural changes. No new layers are needed -- each feature extends existing modules with focused additions.

### High-Level Integration Map

```
                    SLASH COMMANDS (commands/)
                         |
          +--------------+--------------+------------------+
          |              |              |                  |
  branchos:create-pr  branchos:create-workstream  branchos:sync-issues
     (NEW)              (MODIFY --issue)            (MODIFY assignee)
          |              |              |                  |
          v              v              v                  v
     CLI LAYER (src/cli/)
          |              |              |                  |
  create-pr.ts       workstream.ts   sync-issues.ts
     (NEW)            (MODIFY)        (MODIFY)
          |              |              |                  |
          v              v              v                  v
     DOMAIN LAYER
          |              |              |                  |
  src/github/        src/workstream/  src/github/
    pr.ts (NEW)        create.ts       issues.ts
    username.ts (NEW)   (MODIFY)       (MODIFY)
          |              |
          v              v
  src/context/       src/state/
    (no change)        meta.ts (MODIFY -- assignee, issueNumber)
                     src/state/
                       schema.ts (MODIFY -- v3 migration)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/github/pr.ts` (NEW) | PR creation via `gh pr create` | `ghExec` from `github/index.ts` |
| `src/github/username.ts` (NEW) | Capture authenticated GitHub username | `ghExec` from `github/index.ts` |
| `src/cli/create-pr.ts` (NEW) | PR body assembly from workstream context | `github/pr.ts`, `state/meta.ts`, `roadmap/feature-file.ts`, `git/index.ts` |
| `src/github/issues.ts` (MODIFY) | Add `assignIssue` + `viewIssue` functions | `ghExec` from `github/index.ts` |
| `src/state/meta.ts` (MODIFY) | Add `assignee` and `issueNumber` fields | Schema migration |
| `src/workstream/create.ts` (MODIFY) | Add `--issue` flow, auto-capture assignee | `github/username.ts`, `github/issues.ts`, `roadmap/feature-file.ts` |
| `src/context/assemble.ts` | NO CHANGE -- feature body already flows through | Pure function, no new dependencies |
| `src/cli/context.ts` (MODIFY) | Add issue number to feature context table | `roadmap/types.ts` |
| `src/cli/sync-issues.ts` (MODIFY) | Set assignee during sync from workstream meta | `github/issues.ts`, `state/meta.ts` |

### Data Flow

```
WORKSTREAM CREATION (with --issue):
  --issue 42 ──> gh issue view 42 ──> title "[F-003] Auth System"?
                                        ├── YES: extract F-003, delegate to existing --feature flow
                                        └── NO: standard create + store issueNumber in meta
                 gh api user ──> "thumin" ──> meta.assignee

PR CREATION:
  meta.json ──> featureId ──> feature file ──> description + GWT criteria
           ──> assignee ──────────────────────> --assignee flag on gh pr create
           ──> issueNumber ─────────────────> "Closes #N" in PR body
  phases/N/*.md ──────────────────────────────> phase summaries in body
  git diff --stat ────────────────────────────> changed files summary

ASSIGNEE SYNC:
  sync-issues ──> for in-progress features ──> find workstream ──> read meta.assignee
              ──> gh issue edit N --add-assignee <assignee>
```

## New Modules

### 1. `src/github/pr.ts` -- PR Creation

Follows the existing `github/issues.ts` pattern: thin wrapper around `ghExec` with typed options/results.

```typescript
import { ghExec } from './index.js';

export interface CreatePrOptions {
  title: string;
  body: string;
  base?: string;    // defaults to repo default branch
  draft?: boolean;
  assignee?: string;
}

export interface CreatePrResult {
  number: number;
  url: string;
}

export async function createPr(opts: CreatePrOptions): Promise<CreatePrResult> {
  const args = ['pr', 'create', '--title', opts.title];
  // Use --body-file for large bodies (same pattern as createIssue)
  // ...
  if (opts.base) args.push('--base', opts.base);
  if (opts.draft) args.push('--draft');
  if (opts.assignee) args.push('--assignee', opts.assignee);
  const stdout = await ghExec(args);
  // Parse URL + PR number from stdout
}
```

**Why a separate file:** Mirrors `issues.ts` / `milestones.ts` / `labels.ts` pattern. Each GitHub resource type gets its own module.

### 2. `src/github/username.ts` -- GitHub Username Capture

```typescript
import { ghExec } from './index.js';

export async function getGitHubUsername(): Promise<string | null> {
  try {
    const stdout = await ghExec(['api', 'user', '--jq', '.login']);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
```

**Why `gh api user --jq '.login'` over `gh auth status`:** Returns structured data. Parsing `auth status` stderr is brittle and locale-dependent.

### 3. `src/cli/create-pr.ts` -- PR Body Assembly & CLI Handler

The heaviest new module. Assembles a PR body from workstream artifacts.

```typescript
export interface PrBodyParts {
  featureTitle: string | null;
  featureDescription: string | null;
  acceptanceCriteria: string | null;  // GWT-formatted section from feature body
  phaseSummaries: string[];           // from discuss/plan/execute .md files
  linkedIssue: number | null;
  branchDiffStat: string | null;
}

export function buildPrBody(parts: PrBodyParts): string {
  // Deterministic markdown assembly:
  // ## Description
  // [feature description]
  //
  // ## Acceptance Criteria
  // [GWT blocks]
  //
  // ## Changes
  // [diff stat]
  //
  // ## Phase Summaries
  // [discuss/plan/execute highlights]
  //
  // Closes #N
}

export async function createPrHandler(options: CreatePrCliOptions): Promise<CreatePrResult> {
  // 1. ensureWorkstream() → workstream ID + path
  // 2. readMeta() → featureId, assignee, issueNumber
  // 3. If featureId: readFeatureFile() → description, body (contains GWT)
  // 4. Read phase artifacts (discuss.md, plan.md, execute.md)
  // 5. git.getDiffStat() → changed files
  // 6. buildPrBody() → assembled markdown
  // 7. Derive title: feature title or branch name
  // 8. createPr() with body, assignee, "Closes #N" if issue linked
}
```

**Key design decision:** `buildPrBody` is a pure function (no I/O) for testability, following the `assembleContext` pattern. The handler gathers data, the builder formats it.

### 4. `src/roadmap/gwt.ts` -- GWT Formatting Helper

```typescript
export interface GwtScenario {
  name: string;
  given: string;
  when: string;
  then: string;
}

export function formatGwtSection(scenarios: GwtScenario[]): string {
  // Formats as markdown:
  // **Scenario: [name]**
  // - **Given** [given]
  // - **When** [when]
  // - **Then** [then]
}

export function parseGwtFromBody(body: string): GwtScenario[] {
  // Extracts structured GWT from markdown body
  // Used by create-pr to separate acceptance criteria from description
}

export function validateGwtSection(body: string): { valid: boolean; issues: string[] } {
  // Checks if acceptance criteria section uses GWT format
}
```

### 5. `commands/branchos:create-pr.md` -- Slash Command

New slash command following the bookend pattern. The command:
1. Calls `branchos create-pr --preview` to show assembled PR body
2. Presents to user for review/editing
3. On confirmation, calls `branchos create-pr` to actually create
4. Reports PR URL

## Existing Modules That Need Modification

### 1. `src/state/meta.ts` -- Add `assignee` and `issueNumber` Fields

**Current:** `WorkstreamMeta` has `workstreamId`, `branch`, `status`, `createdAt`, `updatedAt`, `featureId?`.

**Change:**

```typescript
export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  featureId?: string;
  assignee?: string;      // NEW: GitHub username of developer
  issueNumber?: number;   // NEW: linked issue (for --issue flow, independent of feature)
}
```

**Schema migration approach:** Both fields are optional. Existing meta.json files work as-is because `migrateIfNeeded` preserves unknown fields via spread. Bump `CURRENT_SCHEMA_VERSION` to 3 with a no-op migration (just version bump) for clarity.

**Do NOT change `createMeta` signature.** Instead, set new fields after creation:

```typescript
const meta = createMeta(workstreamId, branch, featureId);
meta.assignee = await getGitHubUsername() ?? undefined;
if (issueNumber) meta.issueNumber = issueNumber;
await writeMeta(metaPath, meta);
```

This avoids touching the 8+ existing call sites and tests that use the current signature.

### 2. `src/state/schema.ts` -- v2 to v3 Migration

```typescript
export const CURRENT_SCHEMA_VERSION = 3;

// Add to migrations array:
{
  fromVersion: 2,
  migrate: (data) => ({
    ...data,
    schemaVersion: 3,
    // No-op: assignee and issueNumber are optional, absent = undefined
  }),
}
```

### 3. `src/workstream/create.ts` -- Add Issue-Linked Flow

**Current:** Two paths -- standard (branch-derived) and `--feature`.

**Change:** Add third path for `--issue`. All three paths also gain auto-assignee capture.

```
createWorkstream(options) {
  if (options.issueNumber) → createIssueLinkedWorkstream(...)  // NEW
  if (options.featureId)   → createFeatureLinkedWorkstream(...) // EXISTING
  else                     → standard flow                      // EXISTING
  // ALL paths: capture assignee
}
```

**Issue-linked flow logic:**

1. Call `viewIssue(N)` via new function in `github/issues.ts` to get title + body
2. Check if issue was created by `sync-issues` (title pattern: `[F-NNN] ...`)
3. If yes: extract feature ID, delegate to existing `createFeatureLinkedWorkstream`
4. If no: create standard workstream, store `issueNumber` in meta.json
5. All paths: call `getGitHubUsername()`, store as `meta.assignee`

### 4. `src/cli/workstream.ts` -- Add `--issue` Flag

Add `.option('--issue <number>', 'Link to GitHub issue by number')` to create subcommand. Parse as integer, pass to `createWorkstream`.

### 5. `src/github/issues.ts` -- Add `viewIssue` and `assignIssue`

```typescript
export interface IssueView {
  number: number;
  title: string;
  body: string;
  labels: string[];
}

export async function viewIssue(issueNumber: number): Promise<IssueView> {
  const stdout = await ghExec([
    'issue', 'view', String(issueNumber),
    '--json', 'number,title,body,labels',
  ]);
  return JSON.parse(stdout);
}

export async function assignIssue(issueNumber: number, assignee: string): Promise<void> {
  await ghExec(['issue', 'edit', String(issueNumber), '--add-assignee', assignee]);
}
```

Also extend `UpdateIssueOptions` with `assignee?: string` so existing `updateIssue` can set assignees during sync.

### 6. `src/cli/sync-issues.ts` -- Assignee Sync

**Change:** When processing features with `status: 'in-progress'` and a non-null `workstream` field, look up the workstream's `meta.json` for `assignee`. If present, pass to `updateIssue`.

This requires a new import of `readMeta` and reading workstream directories -- a new dependency, but natural since the data needs to flow from workstream metadata to GitHub.

### 7. `src/cli/context.ts` -- Issue Number in Feature Context

**Change:** Add `issue` to `formatFeatureContext` table:

```typescript
function formatFeatureContext(feature: Feature): string {
  const header = [
    // ...existing rows...
    feature.issue ? `| Issue | #${feature.issue} |` : null,
  ].filter(Boolean).join('\n');
  // ...
}
```

### 8. `src/commands/index.ts` -- Register New Command

Import and add `branchos:create-pr.md` to `COMMANDS` record.

### 9. `src/cli/index.ts` -- Register New CLI Command

Import and register `create-pr` CLI command handler.

## Patterns to Follow

### Pattern 1: Thin GitHub Wrappers

**What:** Each GitHub resource (issues, PRs, milestones, labels) gets a file in `src/github/` wrapping `ghExec` with typed options/results.

**When:** Any new GitHub API interaction.

**Why:** Consistent with existing `issues.ts`, `milestones.ts`, `labels.ts`. Safe (argument arrays via `execFile`, no shell injection). Testable (mock `ghExec`).

### Pattern 2: Feature Body as Freeform Markdown (GWT lives here)

**What:** Acceptance criteria in GWT format live in the feature file body under an `## Acceptance Criteria` section heading, not in frontmatter fields.

**When:** Adding structured content to features.

**Why:** The body already flows into context packets via `formatFeatureContext`. No frontmatter schema changes needed. GWT is a formatting convention within markdown, not a data structure. The `plan-roadmap` slash command generates the body -- that is where GWT format gets enforced.

```markdown
## Acceptance Criteria

**Scenario: User creates PR from workstream**
- **Given** a workstream linked to feature F-003
- **When** the user runs `/branchos:create-pr`
- **Then** a GitHub PR is created with feature description and acceptance criteria in the body
```

### Pattern 3: Optional Fields with Graceful Degradation

**What:** New metadata fields (`assignee`, `issueNumber`) are optional. All code paths handle their absence.

**When:** Extending existing data structures.

**Why:** Backward compatibility. Existing workstreams without these fields continue working. Matches how `featureId` was added in v2.0. No migration complexity.

### Pattern 4: Pure Body Assembly

**What:** `buildPrBody()` is a pure function that takes data in and returns markdown out. No I/O.

**When:** Assembling output from multiple sources.

**Why:** Follows the `assembleContext()` pattern exactly. The handler gathers data, the builder formats it. Easy to test with fixtures.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parsing `gh` stderr for Data

**What:** Using `gh auth status` stderr output to extract username.

**Why bad:** Output format is not stable. Breaks on locale changes, format updates.

**Instead:** Use `gh api user --jq '.login'` for structured JSON extraction.

### Anti-Pattern 2: Storing GWT in Frontmatter

**What:** Adding `givenWhenThen` as a frontmatter array field.

**Why bad:** Frontmatter is flat key-value. GWT scenarios are multi-line and nested. The hand-rolled parser does not handle YAML arrays. Adding that complexity gains nothing over markdown body.

**Instead:** Keep GWT in feature body. Convention over schema.

### Anti-Pattern 3: Breaking `createMeta` Signature

**What:** Changing `createMeta(id, branch, featureId?)` to take an options object.

**Why bad:** 8+ existing call sites and tests depend on positional args.

**Instead:** Set new fields on the returned meta object before writing. The meta is mutable before `writeMeta()` is called.

### Anti-Pattern 4: PR Body Assembly in Slash Command

**What:** Having the slash command markdown contain the PR body template logic.

**Why bad:** Untestable. Claude would assemble the body from instructions, producing non-deterministic output.

**Instead:** CLI `create-pr` command assembles the body deterministically via `buildPrBody()`. The slash command calls the CLI and lets the user review before creating.

### Anti-Pattern 5: Requiring `gh` for Non-GitHub Features

**What:** Making GWT acceptance criteria or context assembly depend on GitHub being available.

**Why bad:** GWT formatting and context packets should work offline and without GitHub auth.

**Instead:** GitHub-dependent features (PR creation, assignee capture, issue linking) degrade gracefully. GWT formatting is pure string manipulation. Context assembly is pure function.

## Suggested Build Order

Build order driven by dependency analysis. Each phase independently shippable and testable.

### Phase 1: GWT Acceptance Criteria Format

**Deps:** None. Zero dependencies on other features.

**Why first:** Required by create-pr (Phase 4) for meaningful PR bodies. Can be validated independently.

| Action | File | Type |
|--------|------|------|
| Create GWT formatting/parsing helper | `src/roadmap/gwt.ts` | NEW |
| Update plan-roadmap instructions for GWT format | `commands/branchos:plan-roadmap.md` | MODIFY |
| Add issue number to feature context table | `src/cli/context.ts` | MODIFY |
| Tests | `tests/roadmap/gwt.test.ts` | NEW |

### Phase 2: Automatic Assignee Capture

**Deps:** None. Self-contained.

**Why second:** Establishes assignee data that Phase 4 (create-pr, sync-issues assignee) consumes.

| Action | File | Type |
|--------|------|------|
| GitHub username capture | `src/github/username.ts` | NEW |
| Add `assignee?`, `issueNumber?` to WorkstreamMeta | `src/state/meta.ts` | MODIFY |
| Bump schema version to 3 | `src/state/schema.ts` | MODIFY |
| Auto-capture assignee on all creation paths | `src/workstream/create.ts` | MODIFY |
| Tests | `tests/github/username.test.ts`, `tests/state/meta.test.ts` | NEW/MODIFY |

### Phase 3: Issue-Linked Workstream Creation

**Deps:** Phase 2 (needs assignee field in meta, username capture).

**Why third:** Provides `--issue` flag that feeds into PR creation. Links workstreams to GitHub issues bidirectionally.

| Action | File | Type |
|--------|------|------|
| Add `viewIssue` function | `src/github/issues.ts` | MODIFY |
| Add issue-linked creation path | `src/workstream/create.ts` | MODIFY |
| Add `--issue` CLI flag | `src/cli/workstream.ts` | MODIFY |
| Update slash command docs | `commands/branchos:create-workstream.md` | MODIFY |
| Tests | `tests/workstream/create.test.ts` | MODIFY |

### Phase 4: Create-PR Command & Assignee Sync

**Deps:** Phases 1 + 2 + 3 (GWT for body, assignee for assignment, issue for "Closes #N").

**Why last:** Depends on all prior phases. Culminating feature that ties everything together.

| Action | File | Type |
|--------|------|------|
| PR creation wrapper | `src/github/pr.ts` | NEW |
| PR body assembly + handler | `src/cli/create-pr.ts` | NEW |
| Slash command | `commands/branchos:create-pr.md` | NEW |
| Register command | `src/commands/index.ts` | MODIFY |
| Register CLI command | `src/cli/index.ts` | MODIFY |
| Add `assignee` to `updateIssue` | `src/github/issues.ts` | MODIFY |
| Assignee sync during issue sync | `src/cli/sync-issues.ts` | MODIFY |
| Tests | `tests/github/pr.test.ts`, `tests/cli/create-pr.test.ts` | NEW |

### Phase Ordering Rationale

```
Phase 1 (GWT)  ─────────────────────────────────────┐
Phase 2 (Assignee) ──> Phase 3 (Issue-linked) ──────┤──> Phase 4 (Create-PR + Sync)
```

- Phases 1 and 2 are independent and could be built in parallel
- Phase 3 depends on Phase 2 (meta fields + username capture)
- Phase 4 depends on all three (GWT for body, assignee for PR, issue for "Closes #N")

## Complete File Impact Summary

### New Files (7)

| File | Purpose |
|------|---------|
| `src/github/pr.ts` | Thin `gh pr create` wrapper |
| `src/github/username.ts` | `gh api user` username capture |
| `src/cli/create-pr.ts` | PR body assembly and CLI handler |
| `src/roadmap/gwt.ts` | GWT format/parse/validate helper |
| `commands/branchos:create-pr.md` | Slash command for PR creation |
| `tests/github/pr.test.ts` | PR creation tests |
| `tests/roadmap/gwt.test.ts` | GWT helper tests |

### Modified Files (11)

| File | What Changes |
|------|-------------|
| `src/state/meta.ts` | Add `assignee?`, `issueNumber?` to `WorkstreamMeta` |
| `src/state/schema.ts` | Bump to v3, add no-op v2->v3 migration |
| `src/workstream/create.ts` | Add issue-linked path, auto-capture assignee |
| `src/cli/workstream.ts` | Add `--issue` flag |
| `src/github/issues.ts` | Add `viewIssue`, `assignIssue`, `assignee` in `updateIssue` |
| `src/cli/sync-issues.ts` | Set assignee during sync |
| `src/cli/context.ts` | Add issue number to feature context table |
| `src/commands/index.ts` | Register `branchos:create-pr.md` |
| `src/cli/index.ts` | Register `create-pr` CLI command |
| `commands/branchos:create-workstream.md` | Document `--issue` flag |
| `commands/branchos:plan-roadmap.md` | Add GWT generation instructions |

### Unchanged (everything else)

Context assembly (`src/context/assemble.ts`) needs NO changes. Feature body already flows through. GWT is a formatting convention in the body, not a new context field.

Feature types (`src/roadmap/types.ts`) need NO changes. No new frontmatter fields. The `body` field already holds acceptance criteria as markdown.

Frontmatter parser (`src/roadmap/frontmatter.ts`) needs NO changes. No new frontmatter fields to parse.

## Sources

- Direct analysis of `src/context/assemble.ts` -- AssemblyInput interface, STEP_SECTIONS map, getSection switch (HIGH confidence)
- Direct analysis of `src/workstream/create.ts` -- createWorkstream flow, createFeatureLinkedWorkstream pattern (HIGH confidence)
- Direct analysis of `src/state/meta.ts` -- WorkstreamMeta interface, createMeta signature (HIGH confidence)
- Direct analysis of `src/github/issues.ts` -- createIssue/updateIssue patterns, ghExec usage (HIGH confidence)
- Direct analysis of `src/github/index.ts` -- ghExec wrapper, checkGhAvailable pattern (HIGH confidence)
- Direct analysis of `src/cli/sync-issues.ts` -- syncIssuesHandler flow, feature iteration, auto-commit pattern (HIGH confidence)
- Direct analysis of `src/cli/context.ts` -- contextHandler data loading, formatFeatureContext, research loading (HIGH confidence)
- Direct analysis of `src/roadmap/types.ts` -- Feature/FeatureFrontmatter interfaces (HIGH confidence)
- Direct analysis of `src/roadmap/frontmatter.ts` -- generic frontmatter parse/stringify pattern (HIGH confidence)
- Direct analysis of `src/state/schema.ts` -- migration chain pattern (HIGH confidence)
- Direct analysis of `src/cli/workstream.ts` -- Commander option pattern (HIGH confidence)
- Direct analysis of `src/commands/index.ts` -- command registration pattern (HIGH confidence)
- `gh` CLI capabilities: `gh pr create`, `gh api user`, `gh issue view --json` are stable, well-documented commands (HIGH confidence)
- Project context from `.planning/PROJECT.md` -- v2.2 milestone goals and requirements (HIGH confidence)

---
*Architecture research for: BranchOS v2.2 PR Workflow & Developer Experience*
*Researched: 2026-03-13*
