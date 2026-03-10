---
phase: 09-github-issues-sync-and-roadmap-refresh
plan: 01
subsystem: github, roadmap
tags: [gh-cli, execFile, levenshtein, similarity-matching, feature-status]

requires:
  - phase: 07-roadmap-features
    provides: "Feature types, FeatureStatus, RoadmapData"
provides:
  - "gh CLI wrapper (ghExec, checkGhAvailable) with shell-safe execFile"
  - "GitHub issue create/update operations"
  - "Idempotent milestone and label creation"
  - "Title similarity matching for roadmap refresh"
  - "'dropped' feature status"
affects: [09-02, 09-03, github-issues-sync]

tech-stack:
  added: []
  patterns: ["execFile for shell injection safety", "greedy best-match with similarity matrix"]

key-files:
  created:
    - src/github/index.ts
    - src/github/issues.ts
    - src/github/milestones.ts
    - src/github/labels.ts
    - src/roadmap/similarity.ts
    - tests/github/index.test.ts
    - tests/roadmap/similarity.test.ts
  modified:
    - src/roadmap/types.ts
    - tests/roadmap/frontmatter.test.ts

key-decisions:
  - "execFile over exec for gh CLI calls -- prevents shell injection via argument arrays"
  - "Greedy best-match algorithm for title similarity -- simple, deterministic, no dependency"

patterns-established:
  - "gh CLI wrapper pattern: all GitHub operations go through ghExec for uniform error handling"
  - "Idempotent resource creation: check existence before creating (milestones), or use --force (labels)"

requirements-completed: [GHIS-01, ROAD-04]

duration: 4min
completed: 2026-03-10
---

# Phase 09 Plan 01: Foundation Modules Summary

**gh CLI wrapper with execFile safety, GitHub issue/milestone/label operations, and Levenshtein-based title similarity matching for roadmap refresh**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T06:08:24Z
- **Completed:** 2026-03-10T06:12:15Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built shell-safe gh CLI wrapper using execFile (not exec) with auth detection
- Implemented GitHub issue create/update, idempotent milestone and label modules
- Added 'dropped' to FEATURE_STATUSES for roadmap refresh feature tracking
- Built Levenshtein-based title similarity matching with greedy best-match algorithm

## Task Commits

Each task was committed atomically:

1. **Task 1: gh CLI wrapper and GitHub operations modules**
   - `4db0bef` (test) - Failing tests for gh CLI wrapper
   - `f1ba9bf` (feat) - Implement gh CLI wrapper and operations
2. **Task 2: Title similarity matching module**
   - `4b51bf2` (test) - Failing tests for similarity matching
   - `e325e3d` (feat) - Implement similarity matching module

## Files Created/Modified
- `src/github/index.ts` - gh CLI wrapper with ghExec and checkGhAvailable
- `src/github/issues.ts` - createIssue and updateIssue via gh CLI
- `src/github/milestones.ts` - Idempotent milestone creation via gh api
- `src/github/labels.ts` - Idempotent label creation with --force, status label colors
- `src/roadmap/similarity.ts` - Levenshtein distance, title similarity, feature matching
- `src/roadmap/types.ts` - Added 'dropped' to FEATURE_STATUSES
- `tests/github/index.test.ts` - 13 tests for all GitHub operations
- `tests/roadmap/similarity.test.ts` - 14 tests for similarity matching
- `tests/roadmap/frontmatter.test.ts` - Updated FEATURE_STATUSES test for 'dropped'

## Decisions Made
- Used execFile over exec for gh CLI calls to prevent shell injection via argument arrays
- Greedy best-match algorithm for title similarity -- simple, deterministic, no external dependency
- Two-row DP for Levenshtein (O(n) space instead of O(mn))

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing FEATURE_STATUSES test for 'dropped' addition**
- **Found during:** Post-task verification (full test suite)
- **Issue:** Existing test in frontmatter.test.ts expected exactly 4 statuses, failed after 'dropped' was added
- **Fix:** Updated test to include 'dropped' in expected array
- **Files modified:** tests/roadmap/frontmatter.test.ts
- **Verification:** All 360 tests pass
- **Committed in:** 9aee098

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for test correctness after adding 'dropped' status. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All foundation modules ready for Plan 02 (sync command) and Plan 03 (roadmap refresh)
- ghExec, createIssue, updateIssue, ensureMilestone, ensureLabel all tested and exported
- matchFeaturesByTitle ready for roadmap refresh to detect renamed/dropped/added features

---
*Phase: 09-github-issues-sync-and-roadmap-refresh*
*Completed: 2026-03-10*
