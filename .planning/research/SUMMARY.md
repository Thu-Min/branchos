# Project Research Summary

**Project:** BranchOS v2.2 - PR Workflow & Developer Experience
**Domain:** CLI-based PR automation, structured acceptance criteria, issue-linked workstreams
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

BranchOS v2.2 adds four interconnected capabilities: automated PR creation from workstream artifacts, Given/When/Then acceptance criteria in feature files, issue-linked workstream creation (`--issue #N`), and automatic GitHub assignee tracking. The research unanimously confirms that zero new npm dependencies are needed. All GitHub interactions use the existing `gh` CLI via `ghExec`/`execFile`, and GWT parsing is a ~40-line hand-rolled parser -- consistent with the project's zero-dependency philosophy established in v2.0 and v2.1.

The recommended approach builds these features in four phases ordered by dependency: GWT parsing and assignee capture first (independent, foundational), then issue-linked workstreams (needs assignee infrastructure), then the PR creation command that ties everything together. The architecture research confirms all features integrate into existing module boundaries -- no new layers or structural changes are needed. New code follows proven patterns: thin `ghExec` wrappers in `src/github/`, pure assembly functions for testability, optional metadata fields with graceful degradation.

The primary risks are well-understood and preventable. Always use `--body-file` for PR bodies (markdown corruption via shell args is the top pitfall). Check for existing PRs before creating (duplicate PRs are inevitable without idempotency). Never let GitHub API calls block workstream creation (username capture must be best-effort). Keep GWT format optional, not mandatory -- support plain checklists for technical features that do not fit behavioral scenarios. The existing schema migration system handles the v2-to-v3 meta.json transition cleanly.

## Key Findings

### Recommended Stack

No new runtime or dev dependencies. The entire v2.2 feature set is built with the existing stack: Commander, simple-git, chalk, and the `gh` CLI. The `gh` CLI moves from optional (sync-issues only) to required for PR and assignee features, but the existing `checkGhAvailable()` gate already handles detection and error messaging. See [STACK.md](./STACK.md) for full details.

**Core tools used:**
- `gh pr create`: PR creation with `--body-file`, `--assignee`, `--base`, `--head` flags
- `gh issue view --json`: Fetch issue details for `--issue #N` flow
- `gh issue edit --add-assignee`: Set assignees during sync-issues
- `gh api user --jq .login`: Capture authenticated GitHub username
- Hand-rolled GWT parser (~40 LOC): Extract Given/When/Then from feature body markdown

**Deliberately excluded:** `@cucumber/gherkin` (massive overkill for 4-keyword detection), `@octokit/rest` (duplicates `gh` CLI infrastructure), `gray-matter` (hand-rolled parser is proven), any markdown AST parser, any prompting library.

### Expected Features

See [FEATURES.md](./FEATURES.md) for full analysis including feature specifications and dependency graph.

**Must have (table stakes):**
- PR body includes feature description, linked issue (`Closes #N`), and acceptance criteria
- PR auto-assigned to workstream creator
- PR targets correct base branch
- GWT acceptance criteria in feature files (with freeform fallback)
- Workstream creation from issue number (`--issue #N`)
- Issue assignee synced from workstream metadata

**Should have (differentiators):**
- PR body assembled from phase artifacts (discuss/plan/execute summaries) -- the killer feature; no other tool builds PR body from structured planning artifacts
- GWT criteria rendered as checkboxes in PR body for reviewer verification
- Branch diff summary in PR body
- Dry-run/preview mode before PR creation
- Idempotent PR creation (detect existing PR, offer update instead of duplicate)

**Defer (beyond v2.2):**
- Auto-merge, bidirectional issue sync, multi-PR per workstream, PR review tracking, Cucumber step generation from GWT, rich media in PR body

### Architecture Approach

All features extend existing modules without structural changes. New files follow established patterns: `github/pr.ts` mirrors `github/issues.ts`, `roadmap/gwt.ts` mirrors `roadmap/frontmatter.ts`, and `cli/create-pr.ts` follows the pure-function assembly pattern from `context/assemble.ts`. The key design constraint is that `buildPrBody()` must be a pure function (data in, markdown out) with the handler gathering data separately. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component diagram and data flows.

**New modules (7 files):**
1. `src/github/pr.ts` -- thin `gh pr create` wrapper
2. `src/github/username.ts` -- GitHub username capture via `gh api user`
3. `src/cli/create-pr.ts` -- PR body assembly (pure function) and CLI handler
4. `src/roadmap/gwt.ts` -- GWT format/parse/validate helper
5. `commands/branchos:create-pr.md` -- slash command for PR creation
6. `tests/github/pr.test.ts` and `tests/roadmap/gwt.test.ts` -- test files

**Modified modules (11 files):**
- `state/meta.ts` + `state/schema.ts`: optional `assignee` and `issueNumber` fields, v2-to-v3 migration
- `workstream/create.ts`: `--issue` flow and auto-assignee capture
- `github/issues.ts`: `viewIssue` and `assignIssue` functions
- `cli/sync-issues.ts`: assignee sync during issue create/update
- Registration and documentation files (5 files)

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full analysis with warning signs and recovery strategies.

1. **PR body markdown corruption** -- Always use `--body-file`, never `--body` flag. Backticks, pipes, and newlines in assembled PR bodies break when passed as shell arguments. Make `--body-file` the default from day one, not a size-threshold fallback.
2. **Duplicate PR creation** -- Check for existing PRs on the branch before creating (`gh pr list --head <branch>`). Store PR number in meta after creation. Developers will run the command multiple times; this is not an edge case.
3. **GWT breaking existing feature files** -- Parse GWT from body markdown via `## Acceptance Criteria` heading convention. Do NOT add to frontmatter (the single-line YAML parser cannot handle multi-line values). Do NOT auto-migrate existing files; support freeform fallback.
4. **GitHub username capture blocking workstream creation** -- Wrap in try/catch, return null on failure, never block. The `createWorkstream` function currently has zero GitHub dependencies; do not introduce a hard one.
5. **Assignee setting fails silently** -- Pre-validate assignee via `gh api /repos/.../assignees/<username>` before setting. Add failures to warnings array (existing sync-issues pattern), never abort the sync.

## Implications for Roadmap

Based on dependency analysis across all four research files, the features decompose into four phases.

### Phase 1: GWT Acceptance Criteria Format
**Rationale:** Zero dependencies on other v2.2 features. Required by Phase 4 for meaningful PR bodies. Can be validated and shipped independently.
**Delivers:** `src/roadmap/gwt.ts` (parser/formatter), updated plan-roadmap instructions for GWT generation, issue number in feature context table.
**Addresses:** GWT acceptance criteria parsing (table stakes), backward-compatible body extraction, both GWT and checklist format support.
**Avoids:** Feature file parsing breakage (Pitfall 2) by using body-parsing convention, not frontmatter. Context bloat (Pitfall 10) by extracting and truncating criteria separately from description.

### Phase 2: Automatic Assignee Capture
**Rationale:** Self-contained, foundational for Phases 3 and 4. Establishes the assignee data model that PR creation and sync-issues consume.
**Delivers:** `src/github/username.ts`, `assignee` and `issueNumber` optional fields in WorkstreamMeta, schema v2-to-v3 migration.
**Addresses:** Auto-capture GitHub username (table stakes), graceful degradation without `gh`, backward-compatible schema migration.
**Avoids:** Blocking workstream creation (Pitfall 3) by making capture best-effort. Schema migration omission (Pitfall 7) by writing migration alongside meta changes.

### Phase 3: Issue-Linked Workstream Creation
**Rationale:** Depends on Phase 2 (meta fields, username capture). Provides the `--issue` flag that feeds into PR body's `Closes #N`.
**Delivers:** `--issue #N` flag on create-workstream, `viewIssue` function, issue-to-feature reverse lookup via feature registry scan.
**Addresses:** Issue-linked workstream creation (table stakes), auto-feature-linking from issue title pattern, graceful fallback for unlinked issues.
**Avoids:** Invalid issue handling (Pitfall 4) by stripping `#` prefix, validating via `gh`, and providing clear error messages.

### Phase 4: Create-PR Command and Assignee Sync
**Rationale:** Depends on all prior phases -- GWT for checklist rendering, assignee for PR assignment, issue number for `Closes #N`. This is the culminating feature that ties the v2.2 milestone together.
**Delivers:** `src/github/pr.ts`, `src/cli/create-pr.ts`, `commands/branchos:create-pr.md` slash command, assignee sync in sync-issues, idempotent PR creation with update support.
**Addresses:** PR creation with rich body (table stakes + killer differentiator), assignee on both PRs and issues, phase artifact summaries in PR body.
**Avoids:** Markdown corruption (Pitfall 1) by using `--body-file` exclusively. Duplicate PRs (Pitfall 5) by checking `gh pr list --head <branch>` before creating. Scope creep (Pitfall 9) by keeping create-pr focused on PR creation only -- no feature status updates, no archival.

### Phase Ordering Rationale

- Phases 1 and 2 are independent and can be built in parallel -- no dependencies between them
- Phase 3 depends on Phase 2 (needs `issueNumber` meta field and username capture)
- Phase 4 depends on all three (GWT for body, assignee for `--assignee` flag, issue for `Closes #N`)
- Each phase is independently shippable and testable
- This ordering is consistent across all four research files -- FEATURES.md, ARCHITECTURE.md, and PITFALLS.md all converge on the same dependency graph

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (GWT):** Simple string parsing, well-documented format, no external dependencies. Follows hand-rolled parser precedent.
- **Phase 2 (Assignee):** Single API call + optional field addition. Schema migration follows existing v0-v1-v2 chain.
- **Phase 3 (Issue-linked):** `gh issue view --json` is well-documented. Feature lookup is array filter on existing data.

Phases that may benefit from research during planning:
- **Phase 4 (Create-PR):** Most complex phase. PR body assembly from multiple artifact sources, idempotency logic (check existing PR, then create vs. update via `gh pr edit`), slash command UX flow (preview, confirm, create), and branch-push-before-create logic. Worth a focused research pass on `gh pr edit` and `gh pr list` flags.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All `gh` CLI flags verified against official documentation. |
| Features | HIGH | Features well-scoped, build entirely on existing infrastructure. Clear dependency graph with no ambiguity. |
| Architecture | HIGH | Based on direct codebase analysis of v2.1 source. All integration points mapped to specific files and functions. |
| Pitfalls | HIGH | Sourced from codebase analysis, gh CLI issue tracker, and known platform behavior. All pitfalls have concrete prevention strategies with recovery costs assessed. |

**Overall confidence:** HIGH

### Gaps to Address

- **PR update flow:** Research confirms `gh pr edit` exists but the exact flags for updating body and title were not deeply investigated. Verify during Phase 4 planning.
- **Assignee pre-validation API:** The `GET /repos/{owner}/{repo}/assignees/{username}` endpoint returns 204/404 -- confirm this works through `gh api` during Phase 4 implementation.
- **GWT detection heuristic:** The research recommends supporting both GWT and plain checklists. The exact detection logic (how to distinguish GWT scenarios from regular list items) needs specification during Phase 1 planning.
- **Branch push automation:** Pitfall 11 notes that `gh pr create` requires the branch on the remote. The create-pr flow should auto-push, but the exact UX (silent push vs. confirmation) needs a decision during Phase 4.

## Sources

### Primary (HIGH confidence)
- [gh pr create - Official CLI Manual](https://cli.github.com/manual/gh_pr_create)
- [gh issue view - Official CLI Manual](https://cli.github.com/manual/gh_issue_view)
- [gh issue edit - Official CLI Manual](https://cli.github.com/manual/gh_issue_edit)
- [gh api user - GitHub REST API Docs](https://docs.github.com/en/rest/users/users)
- [REST API for Issue Assignees](https://docs.github.com/en/rest/issues/assignees)
- Direct BranchOS v2.1 codebase analysis (all src/ modules referenced in ARCHITECTURE.md and PITFALLS.md)
- BranchOS PROJECT.md (v2.2 milestone definition and architectural constraints)

### Secondary (MEDIUM confidence)
- [Gherkin acceptance criteria guides](https://testquality.com/gherkin-user-stories-acceptance-criteria-guide/) -- GWT format best practices
- [GitHub PR template best practices](https://graphite.com/guides/comprehensive-checklist-github-pr-template) -- PR body structure
- [When to use GWT acceptance criteria](https://www.ranorex.com/blog/given-when-then-tests/) -- GWT applicability limits
- [Acceptance criteria best practices](https://www.altexsoft.com/blog/acceptance-criteria-purposes-formats-and-best-practices/) -- industry overview

### Tertiary (needs validation)
- gh CLI issue tracker discussions on [duplicate PR creation](https://github.com/cli/cli/discussions/5792), [assignee permission failures](https://github.com/cli/cli/issues/9620), and [multiline body handling](https://github.com/cli/cli/issues/595) -- informed pitfall identification but exact current behavior should be verified during implementation

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
