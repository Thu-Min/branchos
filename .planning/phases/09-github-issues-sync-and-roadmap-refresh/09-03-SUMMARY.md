---
phase: 09-github-issues-sync-and-roadmap-refresh
plan: 03
subsystem: cli, roadmap
tags: [refresh-roadmap, feature-matching, title-similarity, slash-command]

requires:
  - phase: 09-github-issues-sync-and-roadmap-refresh
    plan: 01
    provides: "matchFeaturesByTitle, similarity module"
  - phase: 07-roadmap-features
    provides: "Feature types, RoadmapData, writeFeatureFile, readAllFeatures"
provides:
  - "refresh-roadmap CLI command and handler"
  - "branchos:refresh-roadmap slash command for Claude Code"
  - "Feature merging with metadata preservation"
affects: [roadmap-management, feature-lifecycle]

tech-stack:
  added: []
  patterns: ["feature matching with metadata preservation", "sequential ID generation from max existing"]

key-files:
  created:
    - src/cli/refresh-roadmap.ts
    - tests/cli/refresh-roadmap.test.ts
  modified:
    - src/cli/index.ts
    - src/cli/install-commands.ts

key-decisions:
  - "Title similarity matching with 0.6 threshold for feature identity"
  - "Dropped features keep their files with status=dropped (soft delete)"

patterns-established:
  - "Feature refresh pattern: match by title similarity, preserve metadata, sequential new IDs"

requirements-completed: [ROAD-04, ROAD-05]

duration: 4min
completed: 2026-03-10
---

# Phase 09 Plan 03: Refresh Roadmap Command Summary

**refresh-roadmap CLI command that diffs updated PR-FAQ features against existing ones, preserving metadata on matches, dropping removed features, and assigning sequential IDs to new features**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T06:21:27Z
- **Completed:** 2026-03-10T06:25:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Built refresh-roadmap handler with title-similarity-based feature matching
- Matched features preserve id, status, issue number, workstream, and filename
- Unmatched old features get status='dropped' (soft delete)
- New features get sequential IDs starting after highest existing
- Confirmation flow with --force to skip prompt
- Auto re-ingests PR-FAQ (copies source, updates content hash)
- Registered CLI command with --json and --force flags
- Added branchos:refresh-roadmap slash command for Claude Code

## Task Commits

Each task was committed atomically:

1. **Task 1: refresh-roadmap handler with tests (TDD)**
   - `08c33ca` (test) - Failing tests for refresh-roadmap handler
   - `8251de6` (feat) - Implement refresh-roadmap handler with passing tests
2. **Task 2: CLI registration and slash command**
   - `0fac80f` (feat) - Register refresh-roadmap CLI command and slash command

## Files Created/Modified
- `src/cli/refresh-roadmap.ts` - Handler with RefreshRoadmapOptions/Result interfaces, feature merging logic
- `tests/cli/refresh-roadmap.test.ts` - 11 tests covering validation, matching, dropping, adding, confirmation
- `src/cli/index.ts` - Added registerRefreshRoadmapCommand import and registration
- `src/cli/install-commands.ts` - Added branchos:refresh-roadmap slash command entry

## Decisions Made
- Title similarity matching uses 0.6 threshold (from Plan 01's matchFeaturesByTitle) for feature identity
- Dropped features keep their files with status=dropped rather than being deleted (soft delete preserves history)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 09 fully complete: foundation modules (01), sync-issues (02), and refresh-roadmap (03) all done
- All GitHub Issues sync and roadmap refresh commands operational
- Ready for Phase 10 (if applicable)

---
*Phase: 09-github-issues-sync-and-roadmap-refresh*
*Completed: 2026-03-10*
