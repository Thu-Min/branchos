---
phase: 05-team-coordination
plan: 03
subsystem: cli
tags: [readline, prompt, workstream, branch-switch, tdd]

requires:
  - phase: 01-foundation
    provides: GitOps class, resolveCurrentWorkstream, createWorkstream, isProtectedBranch
  - phase: 05-team-coordination
    provides: registerStatusCommand, registerArchiveCommands from plan 01
provides:
  - ensureWorkstream utility for interactive workstream creation prompt
  - promptYesNo TTY-aware yes/no prompt
  - Integrated branch-switch prompt in all workstream-scoped commands
affects: []

tech-stack:
  added: []
  patterns: [tty-aware-prompting, inline-workstream-creation]

key-files:
  created:
    - src/workstream/prompt.ts
    - tests/workstream/prompt.test.ts
  modified:
    - src/cli/phase-commands.ts
    - src/cli/check-drift.ts
    - src/cli/context.ts

key-decisions:
  - "ensureWorkstream handles all user-facing messaging, handlers suppress redundant error output in non-JSON mode"
  - "promptYesNo returns false in non-TTY environments rather than throwing"
  - "resolvePhaseContext error simplified to sentinel since ensureWorkstream handles messaging"

patterns-established:
  - "TTY-aware prompting: check process.stdin.isTTY before interactive input"
  - "Command guard pattern: ensureWorkstream replaces manual resolveCurrentWorkstream + error handling"

requirements-completed: [WRK-05]

duration: 5min
completed: 2026-03-09
---

# Phase 5 Plan 3: Branch-Switch Prompt and CLI Integration Summary

**TTY-aware branch-switch prompt with inline workstream creation, integrated into all 5 workstream-scoped commands with 9 unit tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T02:59:53Z
- **Completed:** 2026-03-09T03:04:41Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- promptYesNo utility with TTY detection and readline-based yes/no input
- ensureWorkstream guard that resolves existing workstreams, skips protected branches, prompts for inline creation
- All 5 workstream-scoped commands (discuss-phase, plan-phase, execute-phase, context, check-drift) now use ensureWorkstream
- 9 new tests covering all prompt paths including non-TTY, protected branch, confirm, and decline

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for prompt utility** - `0a814f2` (test)
2. **Task 1 GREEN: Implement prompt utility** - `d552269` (feat)
3. **Task 2: Integrate ensureWorkstream into CLI commands** - `d077960` (feat)

## Files Created/Modified
- `src/workstream/prompt.ts` - promptYesNo and ensureWorkstream functions
- `tests/workstream/prompt.test.ts` - 9 unit tests with mocked readline and dependencies
- `src/cli/phase-commands.ts` - resolvePhaseContext uses ensureWorkstream instead of bare resolve
- `src/cli/check-drift.ts` - checkDriftHandler uses ensureWorkstream
- `src/cli/context.ts` - contextHandler uses ensureWorkstream

## Decisions Made
- ensureWorkstream handles all user messaging (prompt text, decline message), so command handlers skip redundant console.error output in non-JSON mode
- promptYesNo returns false (not throws) in non-TTY, allowing ensureWorkstream to print the "Workstream required" message consistently
- resolvePhaseContext error field simplified to sentinel string since ensureWorkstream already communicated to user

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Skipped detect-conflicts registration in index.ts**
- **Found during:** Task 2 planning
- **Issue:** Plan asked to register detect-conflicts command but it was already registered by plan 05-02 running in parallel
- **Fix:** No changes needed to src/cli/index.ts -- detect-conflicts was already registered
- **Verification:** CLI help output shows detect-conflicts command

---

**Total deviations:** 1 noted (plan 05-02 ran in parallel, no action needed)
**Impact on plan:** None -- the command was already available.

## Issues Encountered
- TDD test spying on module's own promptYesNo export didn't intercept internal calls due to ESM semantics. Resolved by mocking node:readline at module level instead of spying on the export.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All phase 5 commands fully registered and accessible via branchos CLI
- ensureWorkstream available for any future workstream-scoped commands
- Full test suite: 219 tests passing across 27 files

---
*Phase: 05-team-coordination*
*Completed: 2026-03-09*
