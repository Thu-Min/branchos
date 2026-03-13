# Phase 18: Create-PR Command & Assignee Sync - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

One-command PR creation from workstream artifacts via `/branchos:create-pr` slash command, plus assignee propagation from workstream metadata to GitHub Issues via sync-issues. Feature link is required — no feature, no PR. PR body is assembled from feature description, GWT acceptance criteria checklist, and linked issue reference.

</domain>

<decisions>
## Implementation Decisions

### PR Body Structure
- Minimal body: feature description + GWT acceptance criteria checklist + `Closes #N` (if issue linked)
- No phase summaries, no diff stats — keep it tight
- GWT checklist reuses `formatGwtChecklist` from Phase 15 (designed for this reuse)
- `Closes #N` included when `meta.issueNumber` is non-null, regardless of how the issue was linked
- PR body written via `--body-file` (not inline `--body`) — matches createIssue pattern for large bodies

### PR Title
- Generated from feature title: `[F-03] Create-PR Command`
- Matches issue title format from sync-issues for consistency
- No title editing — cancel and adjust source if changes needed

### Feature Requirement
- Feature link is required — error and abort if no feature linked to workstream
- Error message: "No feature linked to this workstream. PR creation requires a feature for body assembly."

### Target Branch
- Default to repo's default branch via `gh repo view --json defaultBranchRef`
- No override flag needed for now

### Confirmation Flow
- Slash command displays assembled title + full PR body as text
- AskUserQuestion with "Create PR" / "Cancel" options
- No editing capability — cancel and re-run after adjusting source (feature file, issue, etc.)

### Idempotency
- Before creating, check `gh pr list --head <branch> --json number,url`
- If open PR exists for this branch, show its URL and abort
- Prevents duplicate PRs

### Edge Cases
- **No commits ahead of base:** Error and abort — "No commits ahead of {base}. Nothing to create a PR for."
- **Branch not pushed:** Auto-push with `git push -u origin <branch>` before creating PR
- **Null assignee at PR time:** Late capture fallback — call `captureAssignee()` if `meta.assignee` is null. If that also fails, create PR without assignee silently.

### Assignee Sync in sync-issues (ASN-03)
- sync-issues reads workstream meta files at sync time to find assignees
- For each feature with an issue: scan `.branchos/workstreams/*/meta.json`, match `meta.featureId === feature.id`
- Use `meta.assignee` from the first active workstream found (alphabetical by workstream ID if multiple)
- Add-only mode: `--add-assignee`, never remove existing GitHub assignees
- If no workstream or no assignee found for a feature, skip assignment silently

### Claude's Discretion
- PR body assembly function structure and location
- Exact error message wording for edge cases
- How to detect "no commits ahead" (git rev-list vs git log)
- Whether auto-push needs confirmation or is silent
- Test structure and mock patterns for gh CLI calls

</decisions>

<specifics>
## Specific Ideas

- The `--body-file` pattern from `createIssue` in `src/github/issues.ts` is the precedent for writing PR body via temp file
- `captureAssignee()` already exists in `src/github/index.ts` with the exact tiered fallback behavior needed for late capture
- PR title format `[F-03] Title` mirrors issue title format `[F-03] Title` from sync-issues — consistent across GitHub artifacts
- The slash command is `/branchos:create-pr` — it runs in Claude Code context, so confirmation uses AskUserQuestion (not stdin prompts)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ghExec(args)` (`src/github/index.ts`): execFile wrapper for gh CLI — PR creation will use this
- `captureAssignee()` (`src/github/index.ts`): Returns GitHub username or null — reused for late capture fallback
- `checkGhAvailable()` (`src/github/index.ts`): Pre-flight check for gh CLI availability and auth
- `formatGwtChecklist()` (`src/roadmap/gwt-parser.ts`): Formats parsed GWT as checklist — reused directly in PR body
- `parseAcceptanceCriteria()` (`src/roadmap/gwt-parser.ts`): Parses GWT from feature body
- `formatFeatureContext()` (`src/cli/context.ts:39-75`): Existing feature formatting — PR body assembly follows similar pattern
- `createIssue()` (`src/github/issues.ts`): `--body-file` temp file pattern for large bodies — reuse for PR body
- `readAllFeatures()` (`src/roadmap/feature-file.ts`): Read features for feature lookup
- `readMeta()` (`src/state/meta.ts`): Read workstream metadata for assignee and featureId

### Established Patterns
- `execFile` over `exec` for all gh CLI calls (security decision)
- Temp file cleanup in finally blocks (see `createIssue`)
- Hand-rolled everything, no external deps
- Pure functions for assembly, I/O at the edges

### Integration Points
- New slash command: `.claude/commands/branchos:create-pr.md`
- New PR assembly function (likely `src/github/pr.ts` or similar)
- `syncIssuesHandler()` (`src/cli/sync-issues.ts`): Add assignee propagation logic — scan workstream metas, `--add-assignee` on issue edit
- `updateIssue()` (`src/github/issues.ts`): May need `addAssignees` option added
- Workstream meta scan: read all `meta.json` files from `.branchos/workstreams/*/`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-create-pr-command-assignee-sync*
*Context gathered: 2026-03-13*
