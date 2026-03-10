# Phase 9: GitHub Issues Sync and Roadmap Refresh - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Two capabilities: (1) Push features to GitHub Issues via `gh` CLI for team coordination (`/branchos:sync-issues`), and (2) refresh the roadmap when the PR-FAQ evolves (`/branchos:refresh-roadmap`). Bidirectional sync (pulling status from GitHub back) is deferred to future release (BSYNC-01/02).

</domain>

<decisions>
## Implementation Decisions

### Issue content & mapping
- Issue title = feature title, issue body = full feature file markdown content (description + acceptance criteria)
- Auto-create GitHub milestones from roadmap milestones; assign each issue to its milestone
- Add a status label matching feature status (e.g., "unassigned", "in-progress"); create labels if they don't exist
- Include dependency info in issue body: "Depends on: #42 (F-003)" linking to the dependency's issue number

### Sync idempotency & updates
- Feature file is source of truth — re-sync always overwrites issue body with latest feature file content
- Re-sync updates status labels to match current feature status (removes old label, adds new one)
- Skip features with status 'complete' — don't create or update issues for done work
- Orphaned issues (issue exists but feature removed): warn in sync output but don't auto-close

### Roadmap refresh strategy
- Match new features to existing ones by title similarity; matched features keep ID, status, issue number, workstream link
- Only body/acceptance criteria get updated on matched features; new features get new sequential IDs
- Show summary of proposed changes (N updated, M new, K dropped) and require user confirmation before writing
- Features no longer implied by updated PR-FAQ get status 'dropped' — file kept but excluded from active listings and issue sync
- Auto re-ingest: refresh reads latest PR-FAQ.md directly, updates stored copy and hash, then proceeds with roadmap changes (one command does both steps)

### gh CLI dependency
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FeatureFrontmatter` in `src/roadmap/types.ts`: Already has `issue: number | null` field — ready for issue number storage
- `readAllFeatures()`, `writeFeatureFile()` in `src/roadmap/feature-file.ts`: Read/update feature files with frontmatter
- `readMeta()` in `src/prfaq/hash.ts`: Check PR-FAQ hash for change detection
- `generateRoadmapMarkdown()` in `src/roadmap/roadmap-file.ts`: Regenerate roadmap markdown
- `planRoadmapHandler()` in `src/cli/plan-roadmap.ts`: Existing roadmap generation with `--force` flag pattern
- `FEATURE_STATUSES` in `src/roadmap/types.ts`: Status lifecycle — needs 'dropped' added
- `GitOps.addAndCommit()` in `src/git/index.ts`: Auto-commit pattern
- `success()`, `error()`, `output()` in `src/output/index.ts`: CLI output formatting
- `parseFrontmatter()`, `stringifyFrontmatter()` in `src/roadmap/frontmatter.ts`: YAML frontmatter handling

### Established Patterns
- Commander: `registerXxxCommand(program)` exports from `src/cli/` modules
- Handler pattern: CLI validates input, handler does business logic, returns result
- `--json` flag for machine-readable output (all commands)
- Auto-commit: all state-changing commands commit artifacts to git
- Slash commands: stored as string literals in `install-commands.ts` COMMANDS record
- Confirm-before-commit: plan-roadmap shows summary, asks user to confirm (same pattern for refresh)

### Integration Points
- New `src/cli/sync-issues.ts` module for GitHub Issues sync command
- New `src/cli/refresh-roadmap.ts` module for roadmap refresh command
- New `src/github/` module for gh CLI interaction (check auth, create/update issues, manage milestones/labels)
- Extend `FEATURE_STATUSES` in `src/roadmap/types.ts` with 'dropped'
- New entries in `COMMANDS` record in `install-commands.ts` for both slash commands
- Register commands in `src/cli/index.ts`
- Reads from `.branchos/shared/features/` and `.branchos/shared/ROADMAP.md`
- Reads PR-FAQ from `./PR-FAQ.md` (repo root) and `.branchos/shared/PR-FAQ.md` (stored copy)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-github-issues-sync-and-roadmap-refresh*
*Context gathered: 2026-03-10*
