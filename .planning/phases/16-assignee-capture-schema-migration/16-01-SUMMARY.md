---
phase: 16-assignee-capture-schema-migration
plan: 01
subsystem: state
tags: [schema-migration, github-cli, assignee, workstream-meta]

requires:
  - phase: none
    provides: existing v2 schema and migration system
provides:
  - captureAssignee function with tiered gh CLI fallback
  - v2-to-v3 schema migration with assignee and issueNumber fields
  - WorkstreamMeta interface with assignee and issueNumber
  - createMeta with assignee parameter
  - createWorkstream wiring for automatic assignee capture
affects: [17-issue-linked-workstreams, 18-pr-auto-assignment]

tech-stack:
  added: []
  patterns: [tiered-cli-fallback, schema-migration-chain]

key-files:
  created: []
  modified:
    - src/state/schema.ts
    - src/state/meta.ts
    - src/github/index.ts
    - src/workstream/create.ts
    - tests/state/schema.test.ts
    - tests/state/meta.test.ts
    - tests/github/index.test.ts
    - tests/workstream/create.test.ts
    - tests/state/state.test.ts
    - tests/state/config.test.ts
    - tests/cli/init.test.ts

key-decisions:
  - "assignee and issueNumber are non-optional null fields (not optional/undefined) for explicit presence"
  - "captureAssignee returns null when gh missing (non-blocking) but throws when unauthenticated (blocking)"

patterns-established:
  - "Tiered CLI fallback: not-installed=null, installed-not-authed=throw, ready=use"
  - "Schema fields use explicit null over undefined for required-but-empty semantics"

requirements-completed: [ASN-01, ASN-02, ASN-04, ASN-05]

duration: 6min
completed: 2026-03-13
---

# Phase 16 Plan 01: Assignee Capture and Schema Migration Summary

**captureAssignee with tiered gh CLI fallback, v2-to-v3 schema migration adding assignee/issueNumber fields, wired into both createWorkstream paths**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T05:52:07Z
- **Completed:** 2026-03-13T05:58:12Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Schema migration v2-to-v3 with assignee: null and issueNumber: null fields
- captureAssignee function with three-tier fallback (null/throw/login)
- Both standard and feature-linked workstream creation paths capture assignee automatically
- Full test suite passes (559 tests, zero regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration v2-to-v3 and meta interface update** - `c43f9b7` (feat)
2. **Task 2: captureAssignee function with tiered fallback** - `3153a36` (feat)
3. **Task 3: Wire captureAssignee into createWorkstream** - `d964bf3` (feat)

_Note: TDD tasks combined RED+GREEN into single commits for minimal changes_

## Files Created/Modified
- `src/state/schema.ts` - Added v2-to-v3 migration, bumped CURRENT_SCHEMA_VERSION to 3
- `src/state/meta.ts` - Added assignee/issueNumber to WorkstreamMeta, updated createMeta signature
- `src/github/index.ts` - Added captureAssignee() with tiered gh CLI fallback
- `src/workstream/create.ts` - Wired captureAssignee into both creation paths
- `tests/state/schema.test.ts` - v2-to-v3 migration tests, updated version assertions
- `tests/state/meta.test.ts` - assignee/issueNumber tests, readMeta migration test
- `tests/github/index.test.ts` - 5 new captureAssignee tests
- `tests/workstream/create.test.ts` - Assignee wiring tests with mock
- `tests/state/state.test.ts` - Updated schemaVersion assertion to 3
- `tests/state/config.test.ts` - Updated schemaVersion assertion to 3
- `tests/cli/init.test.ts` - Updated schemaVersion assertion to 3

## Decisions Made
- assignee and issueNumber are non-optional null fields (explicit null, not undefined) for clear presence semantics
- captureAssignee returns null when gh not installed (non-blocking) but throws when unauthenticated (blocking) to prevent silent auth failures

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated schemaVersion assertions in 3 additional test files**
- **Found during:** Task 3 (full test suite run)
- **Issue:** Tests in state.test.ts, config.test.ts, and init.test.ts still expected schemaVersion 2
- **Fix:** Updated assertions to expect schemaVersion 3
- **Files modified:** tests/state/state.test.ts, tests/state/config.test.ts, tests/cli/init.test.ts
- **Verification:** Full test suite passes (559 tests)
- **Committed in:** d964bf3 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary update for schemaVersion bump. No scope creep.

## Issues Encountered
- ESM module spy limitation in readMeta test: Cannot vi.spyOn ESM exports. Fixed by writing actual file to temp directory instead of mocking fs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- captureAssignee ready for use by Phase 17 (issue-linked workstreams)
- Schema v3 with assignee field ready for Phase 18 (PR auto-assignment)
- issueNumber field in place for Phase 17 to populate

---
*Phase: 16-assignee-capture-schema-migration*
*Completed: 2026-03-13*
