---
phase: 05-team-coordination
plan: 02
subsystem: cli
tags: [conflict-detection, workstream-overlap, severity-classification, chalk]

requires:
  - phase: 01-foundation
    provides: GitOps class, WorkstreamMeta, WorkstreamState, discoverWorkstreams
  - phase: 03-phase-lifecycle
    provides: parseAffectedFiles, resolveCurrentWorkstream
  - phase: 05-team-coordination
    plan: 01
    provides: GitOps.getChangedFilesForBranch, statusHandler patterns
provides:
  - detectConflicts pure function for file-level overlap detection with severity
  - gatherWorkstreamFiles for cross-workstream file data gathering
  - detectConflictsHandler with --all and --json output modes
  - CLI command branchos detect-conflicts
affects: [05-03-branch-switch]

tech-stack:
  added: []
  patterns: [pure-function-conflict-detection, severity-classification-high-medium]

key-files:
  created:
    - src/workstream/conflicts.ts
    - src/cli/detect-conflicts.ts
    - tests/workstream/conflicts.test.ts
    - tests/cli/detect-conflicts.test.ts
  modified:
    - src/cli/index.ts

key-decisions:
  - "detectConflicts is a pure function taking WorkstreamFiles[] for easy testing"
  - "High severity requires ALL workstream entries for a file to be source=changed"
  - "gatherWorkstreamFiles tries each PROTECTED_BRANCHES as base for diff, takes first with results"

patterns-established:
  - "Pure conflict detection: build file map, deduplicate per-workstream, classify severity"
  - "Severity classification: high=all changed, medium=any planned involved"

requirements-completed: [TEM-01, TEM-02]

duration: 3min
completed: 2026-03-09
---

# Phase 5 Plan 2: Conflict Detection Summary

**File-level conflict detection between workstreams with high/medium severity classification and pure-function core logic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T03:00:07Z
- **Completed:** 2026-03-09T03:04:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- branchos detect-conflicts compares planned and actual git changes across active workstreams
- Pure detectConflicts function with severity: high (both changed) / medium (any planned)
- gatherWorkstreamFiles reads plan.md and git diffs per workstream with graceful fallbacks
- All 15 new tests passing, full suite of 219 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Conflict detection logic with tests** - `5fb2cfa` (feat)
2. **Task 2: Conflict detection CLI command with tests** - `feae1d2` (feat)

## Files Created/Modified
- `src/workstream/conflicts.ts` - Pure conflict detection, file gathering, and handler
- `src/cli/detect-conflicts.ts` - CLI registration for branchos detect-conflicts
- `src/cli/index.ts` - Wired detect-conflicts command into CLI
- `tests/workstream/conflicts.test.ts` - 13 tests for detection logic, gathering, and handler
- `tests/cli/detect-conflicts.test.ts` - 2 tests for CLI command registration

## Decisions Made
- detectConflicts is a pure function taking WorkstreamFiles[] array, making it fully testable without mocks
- High severity requires ALL workstream entries for a file to have source='changed'; any 'planned' entry downgrades to medium
- gatherWorkstreamFiles iterates PROTECTED_BRANCHES as base for getChangedFilesForBranch, taking first with results

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in src/git/index.ts (simpleGit import typing) -- not introduced by this plan, not fixed (out of scope)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Conflict detection infrastructure ready for branch-switch command (plan 3)
- All workstream comparison patterns established
- Full CLI command suite now includes init, workstream, status, archive, check-drift, context, map-status, detect-conflicts

---
*Phase: 05-team-coordination*
*Completed: 2026-03-09*
