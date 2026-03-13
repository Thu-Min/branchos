# Feature Landscape: PR Workflow & Developer Experience

**Domain:** CLI-based PR creation, structured acceptance criteria, issue-linked workstreams, automatic assignee tracking
**Researched:** 2026-03-13
**Confidence:** HIGH
**Scope:** NEW v2.2 features only. All v2.0/v2.1 features (PR-FAQ, roadmap, features, sync, research, workstreams) are shipped.

## Table Stakes

Features that users of a PR workflow tool expect. Missing these means the feature feels half-baked.

| Feature | Why Expected | Complexity | Depends On (existing) | Notes |
|---------|--------------|------------|----------------------|-------|
| PR body includes feature description | Reviewers need context about what the PR implements | Low | Feature registry (exists) | Pull from feature file body directly |
| PR body includes linked issue reference | Standard GitHub workflow; `Closes #N` auto-closes on merge | Low | GitHub Issues sync (exists) | Use `Closes #N` keyword syntax for auto-close |
| PR body includes acceptance criteria | Reviewers need to know what "done" looks like | Low | Feature files with AC (exists, freeform) | Format depends on GWT migration |
| PR title derived from feature/workstream | Saves developer from typing; consistent naming | Low | Workstream meta (exists) | Pattern: `[F-001] Feature title` matching issue title convention |
| PR auto-assigned to workstream creator | Developer who did the work should own the PR | Low | GitHub username in meta (NEW) | Uses `gh pr create --assignee` |
| PR targets correct base branch | PRs must target main/develop, not random branches | Low | Git operations (exists) | Default to repo default branch; allow override |
| Issue assignee synced from workstream | When someone picks up work, the issue should reflect it | Med | Username capture (NEW), sync-issues (exists) | Add `--add-assignee` to existing sync flow |
| GWT acceptance criteria in feature files | Structured criteria are testable; freeform is ambiguous | Med | Feature file parser (exists) | Migration from freeform to GWT format |
| Workstream creation from issue number | Developers discover work via GitHub Issues, not feature files | Med | GitHub Issues sync (exists), feature registry (exists) | Reverse lookup: issue number to feature to workstream |

## Differentiators

Features that set BranchOS apart from manual `gh pr create`. Not expected, but make the tool genuinely valuable.

| Feature | Value Proposition | Complexity | Depends On (existing) | Notes |
|---------|-------------------|------------|----------------------|-------|
| PR body assembled from phase artifacts | Includes discuss summary, plan, execution notes -- real context, not just template boilerplate | Med | Context assembly (exists), phase artifacts (exists) | This is the killer feature. No other tool builds PR body from structured planning artifacts |
| GWT criteria rendered as checklist in PR body | Reviewers can check off acceptance criteria directly in GitHub PR UI | Low | GWT in feature files (NEW) | Render `- [ ] Given X, When Y, Then Z` as markdown checkboxes |
| Branch diff summary in PR body | Shows files changed with stats, gives reviewer quick scope | Low | Git diff (exists in context assembly) | Reuse `branchDiffStat` from context assembly |
| PR body includes research references | Links to research that informed the implementation | Low | Research system (exists) | Only if feature has `researchRefs` |
| Confirmation flow before PR creation | Show assembled PR body, let developer edit before submitting | Low | Slash command UX patterns (exists) | Essential for trust -- never submit without review |
| Dry-run mode for PR creation | Preview what would be created without hitting GitHub API | Low | Pattern exists in sync-issues | Consistent with existing `--dry-run` convention |
| `--issue #N` reverse-links to feature | Creates workstream and links feature in one step from issue number | Med | Feature registry, GitHub Issues sync | `gh issue view --json` to fetch issue, match to feature by issue number field |
| Auto-capture GitHub username on workstream creation | Zero-config; `gh api /user` captures login automatically | Low | gh CLI availability check (exists) | Store in meta.json as `assignee` field |
| GWT criteria in context packets for execute phase | AI assistant sees structured acceptance criteria during implementation | Low | Context assembly (exists), GWT parser (NEW) | Helps Claude Code write code that satisfies specific criteria |

## Anti-Features

Features to explicitly NOT build for v2.2.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-merge after PR creation | Dangerous; removes human review gate | Create PR as regular or draft; merge is always manual |
| PR template file in `.github/` | BranchOS assembles PR body dynamically from artifacts; static templates conflict with this | Generate body programmatically, pass via `--body-file` |
| Bidirectional issue sync (GitHub to BranchOS) | Explicitly out of scope per PROJECT.md; adds webhook/polling complexity | One-way sync remains: BranchOS to GitHub. `--issue #N` is a one-time pull, not ongoing sync |
| Multi-PR per workstream | One workstream = one branch = one PR. Multi-PR adds state complexity | If work splits, create separate workstreams |
| PR review/approval tracking | GitHub already tracks this; duplicating state creates drift | Use `gh pr status` or GitHub UI for review state |
| Automatic workstream creation from issues | Removes developer agency per PROJECT.md out-of-scope list | `--issue #N` is explicit; developer chooses when to start work |
| Cucumber/step definition generation from GWT | GWT is for human-readable acceptance criteria, not test automation | Keep GWT as structured documentation; tests are separate concern |
| Rich PR body with screenshots/media | CLI tool; no way to capture screenshots programmatically | Text-based sections only; developer can add media after PR creation |
| PR status webhooks/notifications | Requires server component; BranchOS is CLI-only | Developer checks PR status via `gh pr status` |

## Feature Specification Details

### 1. `/branchos:create-pr` Slash Command

**What it does:** Assembles a PR body from workstream artifacts and creates a GitHub PR via `gh pr create`.

**Recommended PR Body Structure:**

```markdown
## Summary

[Feature description from feature file body]

## Changes

[Phase summaries: what was discussed, planned, and executed -- pulled from phase artifacts]

## Acceptance Criteria

- [ ] Given [precondition], When [action], Then [expected result]
- [ ] Given [precondition], When [action], Then [expected result]

## Files Changed

[Branch diff stat summary: N files changed, insertions, deletions]

## Linked Issue

Closes #[issue number]

---
*Created with [BranchOS](https://github.com/Thu-Min/branchos)*
```

**Why this structure works:**
- **Summary** gives reviewers immediate context about what was built and why (from feature description)
- **Changes** is the killer differentiator -- it pulls from actual planning artifacts (discuss/plan/execute markdown), not just commit messages. No other tool does this.
- **Acceptance Criteria** as checkboxes lets reviewers verify completeness directly in the GitHub PR UI by ticking boxes
- **Files Changed** gives quick scope assessment without opening the diff tab
- `Closes #N` triggers GitHub auto-close on merge, completing the lifecycle
- Footer attributes the PR to BranchOS for discoverability

**Implementation approach:**
- New pure function `assemblePrBody(workstreamMeta, feature, phases, diffStat)` -- no I/O, testable. Follows existing `assembleContext` pattern.
- Slash command orchestrates: load context, assemble body, show to developer for confirmation, call `gh pr create`
- Uses `--body-file` for the body (matches existing pattern in `createIssue` for large bodies)
- Uses `--assignee` from meta.json's `assignee` field
- Uses `--base` targeting repo default branch
- Confirmation step: display assembled body, ask developer to confirm or edit before submitting
- Graceful handling: if no feature linked, omit acceptance criteria section. If no phases completed, omit changes section.

**gh pr create flags used:**
- `--title "[F-001] Feature title"` -- consistent with issue title convention
- `--body-file <tempfile>` -- for potentially large bodies
- `--assignee <username>` -- from meta.json
- `--base main` -- or repo default branch
- `--head <current-branch>` -- explicit for safety

**Confidence:** HIGH -- `gh pr create` flags are well-documented and stable. Pure function pattern is proven in codebase.

### 2. Given/When/Then Acceptance Criteria

**What it does:** Migrates freeform acceptance criteria in feature files to structured GWT (Gherkin-lite) format.

**Format in feature files:**

```markdown
## Acceptance Criteria

- Given a workstream linked to feature F-001
  When the developer runs /branchos:create-pr
  Then a GitHub PR is created with the feature description in the body

- Given a feature file with GWT acceptance criteria
  When the PR body is assembled
  Then each criterion appears as a checkbox item
```

**Why GWT over freeform:**
- **Testable:** each criterion has a clear pass/fail condition
- **Consistent:** Given sets context, When defines action, Then defines observable outcome
- **Parseable:** structured format can be extracted and rendered as PR body checklist
- **Industry standard:** over 60% of agile teams use BDD-style criteria (2024 World Quality Report)
- **AI-friendly:** Claude Code can use structured criteria during execute phase to verify implementation

**Best practices to encode in documentation:**
- 1-5 criteria per feature (more suggests the feature should be split)
- Each scenario is atomic and self-contained
- Avoid vague qualifiers ("fast", "user-friendly") -- quantify or define specific outcomes
- Given clause sets up preconditions and system state
- When clause is a single user action
- Then clause is a verifiable, observable outcome

**Parsing approach:**
- Detect GWT blocks within `## Acceptance Criteria` section: lines starting with `- Given` followed by indented `When` and `Then`
- Store as structured data: `{ given: string, when: string, then: string }[]`
- Render in PR body as checkboxes: `- [ ] Given X, When Y, Then Z`
- Render in context packets as structured list (not checkboxes -- AI does not need to check boxes)
- **Backward compatible:** if no GWT pattern detected, fall through to freeform rendering (preserves existing feature file behavior)

**Migration path:** Feature files currently have freeform body text. The parser detects GWT patterns within `## Acceptance Criteria` if present, otherwise treats the body as freeform. No breaking change to existing features. `plan-roadmap` command should be updated to generate GWT-formatted criteria for new features.

**Confidence:** HIGH -- GWT is a well-understood format. Parsing is straightforward string matching.

### 3. Issue-Linked Workstream Creation (`--issue #N`)

**What it does:** Creates a workstream from a GitHub issue number, pulling title/description and auto-linking to the matching feature.

**Flow:**

1. Developer runs `/branchos:create-workstream --issue 42`
2. BranchOS calls `gh issue view 42 --json title,body,number` to fetch issue data
3. Looks up feature by `issue` field in feature registry (`feature.issue === 42`)
4. If feature found: creates feature-linked workstream (reuses existing `--feature` flow)
5. If no feature match: creates standalone workstream with issue title as workstream context
6. Stores `issueNumber: 42` in workstream meta.json

**Why this matters:** Developers discover work through GitHub Issues (assigned to them, visible in project boards, notification emails). The current flow requires knowing the internal feature ID (`F-001`). `--issue #N` bridges GitHub's native UI to BranchOS's workstream model, meeting developers where they already are.

**Edge cases:**
- Issue not found (404): error with clear message ("Issue #42 not found. Check the issue number and ensure gh is authenticated.")
- Issue exists but no matching feature: create standalone workstream, warn that no feature link was found. Store issue number anyway for PR body reference.
- Issue matches feature already in-progress: same error as existing `--feature` flow ("Feature F-001 is already in-progress")
- Multiple features referencing same issue: should not happen (1:1 mapping enforced by sync-issues), but pick first match and warn
- `--issue` and `--feature` both provided: error ("Cannot specify both --issue and --feature")

**Dependency:** Requires `gh` CLI available and authenticated (existing `checkGhAvailable` gate).

**Confidence:** HIGH -- `gh issue view --json` is stable. Feature lookup by issue number is a simple array filter on existing data.

### 4. Automatic GitHub Username Capture

**What it does:** On workstream creation, automatically captures the authenticated GitHub username and stores it in workstream metadata.

**Implementation:**

1. During `createWorkstream()`, call `ghExec(['api', '/user', '--jq', '.login'])` to get username
2. Store as `assignee` field in `meta.json`
3. If `gh` not available or not authenticated: skip silently (graceful degradation -- username is optional)
4. Username is used downstream for:
   - PR `--assignee` flag in create-pr command
   - Issue `--add-assignee` in sync-issues command

**Meta.json schema extension:**

```typescript
export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  featureId?: string;
  assignee?: string;     // NEW: GitHub login username
  issueNumber?: number;  // NEW: linked GitHub issue number
}
```

**Schema migration:** Both new fields are optional (undefined is the default). No schema version bump needed -- existing meta.json files work unchanged. New workstreams get the fields populated automatically.

**Confidence:** HIGH -- `gh api /user` is stable and well-documented. Adding optional fields to meta.json is non-breaking.

### 5. Assignee Tracking in sync-issues

**What it does:** When `sync-issues` runs, if a feature has an in-progress workstream with an assignee, set that assignee on the GitHub issue.

**Implementation changes to existing `syncIssuesHandler`:**

1. Before processing each feature, check if it has a linked workstream (via `workstream` field)
2. If workstream exists, read its meta.json to get `assignee` field
3. Pass assignee to `createIssue` or `updateIssue` calls
4. `createIssue` adds `--assignee <username>` flag
5. `updateIssue` adds `--add-assignee <username>` flag
6. Uses `gh issue edit <number> --add-assignee <username>`

**Edge cases:**
- Workstream has no assignee (gh not available when created): skip assignee setting, no error
- User is not a collaborator on the repo: `gh issue edit --add-assignee` will fail. Catch the error and add to `warnings[]` array (matches existing error handling pattern in sync-issues)
- Feature has no linked workstream: no assignee to set, skip
- `@me` shorthand: NOT used. Store actual username to support team scenarios where one developer syncs issues for another developer's workstream

**Confidence:** HIGH -- `gh issue edit --add-assignee` is documented. Warning-on-failure matches the existing error handling pattern already used throughout sync-issues.

## Feature Dependencies

```
GitHub username capture ----+----> PR auto-assignment (create-pr uses assignee from meta)
                            |
                            +----> Issue assignee sync (sync-issues uses assignee from meta)

GWT acceptance criteria ----+----> PR body assembly (renders GWT as checkboxes)
                            |
                            +----> Context packets (structured GWT in execute phase)

Issue-linked workstream ---------> Requires GitHub Issues sync (issue numbers in feature files)

PR body assembly ----------------> Requires feature registry + phase artifacts + git diff
```

**Build order implication:**
1. **First:** Username capture + GWT parser (no dependencies on each other, can be built in parallel)
2. **Second:** PR body assembly function (needs GWT parser for checklist rendering)
3. **Third:** `/branchos:create-pr` slash command (needs PR body assembly)
4. **Parallel with above:** Issue-linked workstream + assignee sync in sync-issues (independent of PR creation)

## MVP Recommendation

**Prioritize (table stakes + highest-value differentiator):**

1. **GitHub username auto-capture** -- foundational; needed by both PR and assignee features. Low complexity, high leverage.
2. **GWT acceptance criteria parser** -- needed for structured PR body. Medium complexity but well-defined scope.
3. **PR body assembly function** -- the core value proposition of v2.2. Pure function, testable, reuses existing patterns. Medium complexity.
4. **`/branchos:create-pr` slash command** -- user-facing feature that ties everything together. Medium complexity.
5. **Issue-linked workstream (`--issue #N`)** -- bridges GitHub UI to BranchOS. Medium complexity.
6. **Assignee tracking in sync-issues** -- low complexity addition to existing command.

**Defer:** Nothing. All v2.2 features are well-scoped with clear implementations and build on existing infrastructure. Ship them all.

## Complexity Assessment

| Feature | Estimated Effort | Risk | Notes |
|---------|-----------------|------|-------|
| GitHub username capture | LOW | LOW | Single `ghExec` call + optional field in meta.json. Graceful degradation if gh unavailable. |
| GWT acceptance criteria parser | MEDIUM | LOW | String parsing with regex/pattern matching. Backward compatible -- freeform fallback preserved. |
| PR body assembly function | MEDIUM | LOW | Pure function following `assembleContext` pattern. Multiple sections, each straightforward. |
| `/branchos:create-pr` command | MEDIUM | MEDIUM | Slash command with confirmation flow + `gh pr create` invocation. Risk: edge cases in gh CLI error handling. |
| Issue-linked workstream | MEDIUM | LOW | `gh issue view --json` + feature lookup. Reuses existing `--feature` flow after resolution. |
| Assignee sync in sync-issues | LOW | LOW | Add `--add-assignee` to existing create/update calls. Warning on failure. |
| **Total** | **MEDIUM** | **LOW** | Builds entirely on existing patterns. No new architectural concepts. |

## Sources

- [gh pr create manual](https://cli.github.com/manual/gh_pr_create) -- HIGH confidence, official GitHub CLI docs
- [gh issue edit manual](https://cli.github.com/manual/gh_issue_edit) -- HIGH confidence, official GitHub CLI docs
- [Gherkin User Stories Acceptance Criteria Guide 2026](https://testquality.com/gherkin-user-stories-acceptance-criteria-guide/) -- MEDIUM confidence, industry guide
- [GWT Acceptance Criteria for Better User Stories](https://www.parallelhq.com/blog/given-when-then-acceptance-criteria) -- MEDIUM confidence, practitioner guide
- [GitHub PR Template Checklist](https://graphite.com/guides/comprehensive-checklist-github-pr-template) -- MEDIUM confidence, PR template best practices
- [GitHub PR Template Guide 2026](https://everhour.com/blog/github-pr-template/) -- MEDIUM confidence, PR template sections and structure
- [When to Use GWT Acceptance Criteria](https://www.ranorex.com/blog/given-when-then-tests/) -- MEDIUM confidence, when GWT is appropriate
- [Acceptance Criteria Best Practices](https://www.altexsoft.com/blog/acceptance-criteria-purposes-formats-and-best-practices/) -- MEDIUM confidence, industry overview
- [gh issue edit --add-assignee known issues](https://github.com/cli/cli/issues/6235) -- HIGH confidence, GitHub CLI issue tracker
- [gh api /user for username](https://docs.github.com/en/rest/users/users) -- HIGH confidence, official GitHub REST API docs
- BranchOS source code analysis -- HIGH confidence, direct review of `src/workstream/create.ts`, `src/github/issues.ts`, `src/github/index.ts`, `src/context/assemble.ts`, `src/roadmap/types.ts`, `src/roadmap/feature-file.ts`, `src/state/meta.ts`, `src/cli/sync-issues.ts`

---
*Feature research for: BranchOS v2.2 PR Workflow & Developer Experience*
*Researched: 2026-03-13*
