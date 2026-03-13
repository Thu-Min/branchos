# Technology Stack

**Project:** BranchOS v2.2 - PR Workflow & Developer Experience
**Researched:** 2026-03-13
**Scope:** Stack additions for PR creation, Gherkin acceptance criteria, GitHub assignee management, issue detail fetching

## Executive Summary

No new dependencies needed. All four capabilities are achievable using the existing `gh` CLI via `execFile` (the established `ghExec` pattern) and hand-rolled parsing for Given/When/Then format. This is consistent with the project's zero-dependency philosophy for GitHub integration and the precedent of the hand-rolled YAML frontmatter parser.

## Recommended Stack Additions

### New Runtime Dependencies

**None.** Zero new npm dependencies required.

### New `gh` CLI Commands Used

| Command | Purpose | Flags | Confidence |
|---------|---------|-------|------------|
| `gh pr create` | Create PR from workstream | `--title`, `--body-file`, `--base`, `--assignee`, `--head` | HIGH |
| `gh issue view <N>` | Fetch issue details by number | `--json title,body,labels,milestone,assignees,url` | HIGH |
| `gh issue edit <N>` | Set assignee on synced issues | `--add-assignee <login>` | HIGH |
| `gh api user` | Get current authenticated username | `--jq .login` | HIGH |

## Detailed Analysis

### 1. PR Creation via `gh pr create`

**Approach:** Use `ghExec` with argument array (existing pattern from `github/issues.ts`).

**Key flags:**
- `--title "text"` - PR title
- `--body-file <path>` - PR body from temp file (reuse the temp-file pattern from `createIssue` for large bodies)
- `--base <branch>` - Target branch (typically `main`)
- `--head <branch>` - Source branch (current workstream branch)
- `--assignee <login>` - Auto-assign PR creator

Note: `--repo` is not needed; `gh` auto-detects from git remote.

**Implementation pattern:**
```typescript
// New file: github/pr.ts -- follows existing createIssue pattern in github/issues.ts
export async function createPullRequest(opts: CreatePROptions): Promise<{ number: number; url: string }> {
  const args = ['pr', 'create', '--title', opts.title, '--base', opts.base];
  // Use --body-file for large PR bodies (same temp-file pattern as createIssue)
  // Use --assignee for auto-assignment
  // Parse URL from stdout to extract PR number
}
```

**Why not `@octokit/rest`:** The `gh` CLI handles auth, repo detection, and error formatting. Adding Octokit would add a dependency, require token management, and duplicate what `gh` already provides. The project has an established `ghExec` wrapper using `execFile` to prevent shell injection.

**Confidence:** HIGH - flags verified via official CLI manual.

### 2. Given/When/Then (Gherkin) Acceptance Criteria

**Approach:** Hand-roll a simple parser/formatter. Do NOT use `@cucumber/gherkin` or any Gherkin library.

**Why hand-roll:**
- BranchOS uses a simplified subset: only `Given`, `When`, `Then`, `And` keywords in plain text
- No need for feature files, scenarios, data tables, backgrounds, scenario outlines, or any Cucumber execution features
- `@cucumber/gherkin` (official parser) is a heavy dependency designed for test execution, not document formatting
- Project precedent: hand-rolled YAML frontmatter parser (`roadmap/frontmatter.ts`) over `gray-matter`
- The format is structurally simple: lines starting with `Given`/`When`/`Then`/`And` keywords

**Format in feature file body:**
```markdown
## Acceptance Criteria

Given a workstream linked to feature F-001
When the developer runs /branchos:create-pr
Then a GitHub PR is created with the feature description in the body
And the PR is assigned to the workstream creator
```

**Parsing approach:**
```typescript
// New file: roadmap/acceptance.ts (~40-50 lines)
interface AcceptanceCriterion {
  given: string[];   // conditions
  when: string[];    // actions
  then: string[];    // expected outcomes
}

// Parse markdown body to extract Given/When/Then blocks
// Simple line-by-line parser tracking current keyword context
// "And" appends to whichever keyword (given/when/then) was last seen
```

**Why not a library:**
- `@cucumber/gherkin` (~200KB) parses full `.feature` file syntax including `Feature:`, `Scenario:`, `Background:`, tags, data tables, doc strings
- We need to detect lines starting with 4 keywords in a markdown section
- A hand-rolled parser is ~40-50 lines of TypeScript, fully testable, zero dependencies
- Consistent with project philosophy: "Zero new dependencies for [feature]" (v2.1 precedent)

**Confidence:** HIGH - format is simple enough that a library adds complexity without value.

### 3. GitHub Assignee Management

**Approach:** Use `gh issue edit --add-assignee` for setting assignees on issues during `sync-issues`.

**For issue assignees (sync-issues enhancement):**
```typescript
// Add --add-assignee to existing updateIssue or create dedicated function
await ghExec(['issue', 'edit', String(issueNumber), '--add-assignee', username]);
```

**For getting current GitHub username (workstream creation):**
```typescript
// New function in github/index.ts
export async function getGitHubUsername(): Promise<string> {
  const login = await ghExec(['api', 'user', '--jq', '.login']);
  return login.trim();
}
```

**Why `gh api user` over `gh auth status`:** `gh auth status` does not have a stable `--json username` output. `gh api user --jq .login` returns just the login string, clean and directly parseable. This is the idiomatic way to get the current user.

**Why `--add-assignee` over REST API:** The `gh issue edit --add-assignee` flag handles auth, repo context, and is idempotent (adding an already-assigned user is a no-op). Using `gh api` with POST to `/repos/{owner}/{repo}/issues/{issue_number}/assignees` works but requires manually constructing JSON payloads for no benefit.

**Confidence:** HIGH - verified via official `gh issue edit` manual and `gh api user` endpoint.

### 4. Fetching Issue Details by Number

**Approach:** Use `gh issue view <N> --json <fields>`.

**Available JSON fields (verified):** `assignees`, `author`, `body`, `closed`, `closedAt`, `comments`, `createdAt`, `id`, `labels`, `milestone`, `number`, `state`, `title`, `updatedAt`, `url`

**Implementation:**
```typescript
// New function in github/issues.ts
export interface GitHubIssueDetails {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  milestone?: { title: string };
  assignees: Array<{ login: string }>;
  url: string;
}

export async function getIssueDetails(issueNumber: number): Promise<GitHubIssueDetails> {
  const json = await ghExec([
    'issue', 'view', String(issueNumber),
    '--json', 'number,title,body,labels,milestone,assignees,url'
  ]);
  return JSON.parse(json);
}
```

**Linking issue to feature:** When `create-workstream --issue #N` is used, the fetched issue title can be matched against existing features using the title similarity matching already in `roadmap/similarity.ts` to auto-link to the feature that created the issue via `sync-issues`.

**Confidence:** HIGH - `gh issue view --json` is well-documented and stable.

## Integration Points with Existing Code

| New Capability | Existing Code to Extend | Integration Approach |
|---------------|------------------------|---------------------|
| PR creation | `github/index.ts` (ghExec) | New `github/pr.ts` module, same pattern as `github/issues.ts` |
| Given/When/Then parsing | `roadmap/frontmatter.ts` (generic parser) | New `roadmap/acceptance.ts` module for parsing/formatting |
| Assignee on issues | `github/issues.ts` (updateIssue) | Add `--add-assignee` arg to `updateIssue` opts, or new `setIssueAssignee` |
| Issue detail fetching | `github/issues.ts` | New `getIssueDetails` function in same module |
| Username in workstream | `state/meta.ts` (WorkstreamMeta) | Add optional `assignee` field to `WorkstreamMeta` |
| GWT in context packets | `context/assemble.ts` | Parse acceptance criteria from feature body, format as structured section |

## Schema Changes Required

### WorkstreamMeta (state/meta.ts)

Add optional `assignee` field:
```typescript
export interface WorkstreamMeta {
  // ... existing fields
  assignee?: string;  // GitHub username captured on create-workstream
}
```

This is backward compatible -- existing workstreams without `assignee` continue to work. No schema migration needed since `meta.json` parsing uses `JSON.parse` (not strict validation).

### FeatureFrontmatter (roadmap/types.ts)

No changes needed. Acceptance criteria live in the feature body (markdown), not frontmatter. The Given/When/Then format is parsed from the body's `## Acceptance Criteria` section.

## What NOT to Add

| Library | Why Not |
|---------|---------|
| `@cucumber/gherkin` | Massive overkill; we need 4-keyword detection, not a full BDD framework parser |
| `@octokit/rest` | `gh` CLI handles auth, repo detection, rate limiting; Octokit duplicates infrastructure |
| `gray-matter` | Already rejected in v2.0; hand-rolled frontmatter parser works well |
| `gherkin-parse` / `gherkin-parser` | Designed for `.feature` files, not markdown sections |
| Any markdown parser (`marked`, `remark`) | Feature bodies are raw markdown; no AST needed for keyword extraction |
| `inquirer` / `@clack/prompts` | Runs inside Claude Code; no terminal prompting needed |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| GitHub integration | `gh` CLI via `execFile` | `@octokit/rest` | Extra dependency, token management, loses repo auto-detection |
| GWT parsing | Hand-rolled (~40 LOC) | `@cucumber/gherkin` | 200KB+ dependency for 4-keyword detection |
| Username retrieval | `gh api user --jq .login` | `gh auth status` parsing | No stable JSON output for username |
| PR body assembly | Temp file + `--body-file` | `--body` flag inline | PR bodies will be large; body-file is safer for shell limits |
| Assignee setting | `gh issue edit --add-assignee` | `gh api POST .../assignees` | CLI flag is simpler, idempotent, no JSON construction |

## Dependency Impact

| Metric | v2.1 (current) | v2.2 (after additions) |
|--------|----------------|------------------------|
| Runtime deps | 3 (commander, simple-git, chalk) | 3 (unchanged) |
| Dev deps | 5 (@types/node, tsup, tsx, typescript, vitest) | 5 (unchanged) |
| External tool deps | git, gh (optional) | git, gh (**required** for PR/assignee features) |
| New source files | -- | ~3-4 (`github/pr.ts`, `roadmap/acceptance.ts`, slash command) |

**Note:** `gh` CLI moves from optional (used only by `sync-issues`) to required for the new PR creation and assignee features. The existing `checkGhAvailable()` function in `github/index.ts` already handles detection and provides clear error messages.

## Installation

```bash
# No new packages to install
# Existing dependencies are sufficient:
#   - commander (CLI)
#   - simple-git (git operations)
#   - chalk (output formatting)
#   - gh CLI (system dependency, now required for v2.2 features)
```

## Sources

- [gh pr create - Official CLI Manual](https://cli.github.com/manual/gh_pr_create) - HIGH confidence
- [gh issue view - Official CLI Manual](https://cli.github.com/manual/gh_issue_view) - HIGH confidence
- [gh issue edit - Official CLI Manual](https://cli.github.com/manual/gh_issue_edit) - HIGH confidence
- [gh auth status - Official CLI Manual](https://cli.github.com/manual/gh_auth_status) - HIGH confidence
- [REST API for Issue Assignees - GitHub Docs](https://docs.github.com/en/rest/issues/assignees) - HIGH confidence
- [@cucumber/gherkin - npm](https://www.npmjs.com/package/@cucumber/gherkin) - HIGH confidence (verified exists, rejected)

---
*Stack research for: BranchOS v2.2 PR Workflow & Developer Experience*
*Researched: 2026-03-13*
