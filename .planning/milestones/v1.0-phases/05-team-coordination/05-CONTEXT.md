# Phase 5: Team Coordination - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers can see what their teammates are working on, detect file-level conflicts early, cleanly close out completed workstreams, and get prompted to create workstreams on unmapped branches. This phase delivers `branchos status`, `branchos detect-conflicts`, `branchos archive`, `branchos unarchive`, and branch-switch prompts on workstream-scoped commands.

</domain>

<decisions>
## Implementation Decisions

### Status overview (`branchos status`)
- Full detail per workstream row: workstream ID, branch, current phase number + step (e.g. "Phase 2 / plan"), last activity timestamp, workstream status
- Active workstreams only by default; `--all` flag to include archived
- Last activity determined from `meta.json updatedAt` timestamp (no git lookups)
- Current branch's workstream highlighted with a marker (e.g. ▶)
- `--json` flag for machine-readable output (consistent with all commands)

### Conflict detection (`branchos detect-conflicts`)
- Compare both planned files (from plan.md affected files) AND actual changed files (git diff on branch) across workstreams
- Default scope: current workstream vs all others; `--all` flag to check every pair
- Output grouped by file: each conflicting file lists which workstreams touch it and how (planned vs changed)
- Two severity levels: High (both workstreams have actual changes to same file), Medium (one planned + one actual, or both planned)
- `--json` flag for machine-readable output

### Workstream archival (`branchos archive`)
- Manual trigger only — user runs `branchos archive <workstream>`
- Archive = set meta.json status to 'archived' + update updatedAt; directory stays in `.branchos/workstreams/`
- If branch isn't merged into a protected branch, warn "Branch not merged — are you sure?" and require `--force` or confirmation to proceed
- `branchos unarchive <workstream>` command to flip status back to 'active' (simple status toggle since files stay in place)
- Archived workstreams excluded from `status` and `detect-conflicts` by default

### Branch-switch prompts
- Triggered on workstream-scoped commands only: discuss-phase, plan-phase, execute-phase, context, check-drift
- Interactive prompt: "No workstream for branch 'feature/xyz'. Create one now? (y/n)"
- If user confirms: run create workstream inline, then continue with original command
- If user declines: exit gracefully with "Workstream required for this command."
- Protected branches (main/master/develop) excluded — never prompt on these (uses existing PROTECTED_BRANCHES constant)

### Claude's Discretion
- Table formatting and column widths for status output
- Exact severity labels and color coding for conflict detection
- How to handle edge cases (deleted branches, workstreams with no phases, merge detection method)
- Interactive prompt library choice (readline, inquirer, or simple stdin)
- Error messaging wording

</decisions>

<specifics>
## Specific Ideas

- Interactive prompt for branch-switch (not just a suggestion message) — user chose convenience over non-blocking output
- Severity levels in conflict detection help teams prioritize which overlaps to address first
- Archive/unarchive is a simple status toggle since files stay in place — git history preserves everything
- `--all` pattern on both status and detect-conflicts for comprehensive views when needed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `discoverWorkstreams()` (src/workstream/discover.ts): lists workstream IDs by scanning for meta.json — direct reuse for status and conflict detection
- `readMeta()` / `writeMeta()` (src/state/meta.ts): read/write WorkstreamMeta with status field already supporting 'active' | 'archived'
- `readState()` (src/state/state.ts): read WorkstreamState with currentPhase and phases array — for status display
- `resolveCurrentWorkstream()` (src/phase/index.ts): matches current branch to workstream via meta.json — for branch-switch check
- `GitOps` class (src/git/index.ts): `getCurrentBranch()`, `getChangedFiles()`, `getMergeBase()`, `addAndCommit()`
- `parseAffectedFiles()` (src/phase/drift.ts): extracts planned files from plan.md — reuse for conflict detection
- `PROTECTED_BRANCHES` constant (src/constants.ts): ['main', 'master', 'develop'] — for branch-switch exclusion
- Output formatting (src/output/index.ts): `warning()`, `success()`, `error()` with chalk and `--json` support
- Commander CLI setup (src/cli/index.ts): `registerXxxCommand(program)` pattern

### Established Patterns
- Commander subcommand registration via `registerXxxCommand(program)` functions
- `--json` flag on all commands for machine-readable output
- Auto-commit via `GitOps.addAndCommit()` after state changes
- Async-first I/O with `fs/promises`
- Separate handler export for testability
- Schema migration via `migrateIfNeeded()` on read

### Integration Points
- `src/cli/status.ts` — new CLI command module for status
- `src/cli/detect-conflicts.ts` — new CLI command module for conflict detection
- `src/cli/archive.ts` — new CLI command module for archive/unarchive
- `src/cli/index.ts` — register new commands
- `src/workstream/discover.ts` — may need filtering by status (active vs archived)
- Workstream-scoped commands — add branch-switch check middleware or shared utility

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-team-coordination*
*Context gathered: 2026-03-09*
