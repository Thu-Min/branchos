---
phase: 02-codebase-mapping
plan: 02
subsystem: map
tags: [staleness, git-ops, cli-command, map-status]

requires:
  - phase: 02-codebase-mapping
    provides: MapMetadata interface, parseMapMetadata, MAP_FILES, config extension
provides:
  - GitOps getHeadHash() and getCommitsBehind() methods
  - StalenessResult interface and checkStaleness function
  - map-status CLI command with human and JSON output
affects: [context-assembly, slash-commands]

tech-stack:
  added: []
  patterns: [staleness-detection, cli-handler-with-testable-export]

key-files:
  created:
    - src/map/staleness.ts
    - src/cli/map-status.ts
    - tests/map/staleness.test.ts
    - tests/cli/map-status.test.ts
  modified:
    - src/git/index.ts
    - src/map/index.ts
    - src/cli/index.ts
    - tests/git/index.test.ts

key-decisions:
  - "mapStatusHandler exported separately from registerMapStatusCommand for direct testability"
  - "checkStaleness reads first valid map file metadata rather than requiring all files"
  - "getCommitsBehind returns -1 on error rather than throwing, enabling graceful unknown-hash handling"

patterns-established:
  - "CLI handler export pattern: export handler function separately from command registration for testing"
  - "Staleness detection: compare map metadata commit hash against HEAD via rev-list count"

requirements-completed: [MAP-03]

duration: 3min
completed: 2026-03-08
---

# Phase 2 Plan 2: Staleness Detection and Map Status Summary

**GitOps hash comparison with configurable staleness threshold and branchos map-status CLI command**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T04:38:25Z
- **Completed:** 2026-03-08T04:41:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended GitOps with getHeadHash() and getCommitsBehind() methods for commit distance calculation
- Built checkStaleness module handling missing maps, current maps, stale maps, and rebased/unknown hashes
- Created map-status CLI command with human-readable and --json output modes, including yellow warning for stale maps

## Task Commits

Each task was committed atomically:

1. **Task 1: GitOps extensions and staleness detection module** - `2a967e5` (feat)
2. **Task 2: map-status CLI command** - `6710627` (feat)

_Both tasks followed TDD flow: RED (failing tests) then GREEN (implementation)._

## Files Created/Modified
- `src/git/index.ts` - Added getHeadHash() and getCommitsBehind() methods to GitOps class
- `src/map/staleness.ts` - StalenessResult interface and checkStaleness function
- `src/map/index.ts` - Barrel export updated with staleness exports
- `src/cli/map-status.ts` - map-status command handler with human and JSON output
- `src/cli/index.ts` - Registered map-status command
- `tests/git/index.test.ts` - Added 4 tests for getHeadHash and getCommitsBehind
- `tests/map/staleness.test.ts` - 6 tests for checkStaleness edge cases
- `tests/cli/map-status.test.ts` - 4 tests for map-status handler

## Decisions Made
- mapStatusHandler exported separately from registerMapStatusCommand following the pattern from init.ts, enabling direct handler testing without CLI parsing
- checkStaleness reads the first valid map file with metadata rather than requiring all 5 files to exist
- getCommitsBehind returns -1 on git error (unknown hash) rather than throwing, enabling graceful handling of post-rebase scenarios

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Staleness detection fully operational for integration with context assembly
- map-status command ready for users to check map currency
- All 97 tests passing across the full test suite

## Self-Check: PASSED

- All 8 files verified present on disk
- All 2 task commits verified: 2a967e5, 6710627
- All 97 tests pass (83 existing + 14 new)

---
*Phase: 02-codebase-mapping*
*Completed: 2026-03-08*
