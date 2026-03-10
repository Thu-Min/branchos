---
phase: 10-slash-command-migration
plan: 02
subsystem: cli
tags: [slash-commands, cli-refactor, dual-directory, version-bump]

# Dependency graph
requires:
  - phase: 10-slash-command-migration
    plan: 01
    provides: "14 .md slash command files and COMMANDS barrel export"
provides:
  - "Refactored CLI bootstrapper with only init + install-commands + utility commands"
  - "Dual-directory install (commands/ + skills/) for Claude Code compatibility"
  - "Init auto-installs slash commands on every run"
  - "Version 2.0.0 across package.json and CLI"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["dual-directory slash command install", "vitest markdown raw plugin for .md imports"]

key-files:
  created:
    - tests/cli/install-commands.test.ts
  modified:
    - src/cli/install-commands.ts
    - src/cli/index.ts
    - src/cli/init.ts
    - package.json
    - vitest.config.ts
    - tests/cli/init.test.ts

key-decisions:
  - "Exported installSlashCommands/uninstallSlashCommands helpers for reuse by init"
  - "Vitest markdown raw plugin to support .md imports in test environment"

patterns-established:
  - "Dual-directory install pattern: commands/ + skills/ for Claude Code compatibility"
  - "Init always refreshes slash commands (both fresh and re-init)"

requirements-completed: [MIGR-01, MIGR-02]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 10 Plan 02: CLI Refactor Summary

**Refactored CLI to slash-command-first bootstrapper with dual-directory install, init auto-install, and version 2.0.0**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T08:13:39Z
- **Completed:** 2026-03-10T08:17:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced 730-line inline COMMANDS record with single import from src/commands/index.ts barrel export
- Added dual-directory install to both ~/.claude/commands/ and ~/.claude/skills/ for Claude Code compatibility
- Stripped CLI from 15 registered commands down to 6 (init, install-commands, + 4 utility commands for npx delegation)
- Wired init to auto-run installSlashCommands on both fresh init and re-init
- Bumped version to 2.0.0 in package.json and CLI
- Added vitest markdown raw plugin for .md import support in tests
- Full test suite: 444 tests passing, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor install-commands.ts with dual-directory support and strip CLI index.ts**
   - `f667fff` (test) - Failing tests for CLI refactor
   - `712d960` (feat) - Implementation: refactored install-commands, stripped CLI, version bump
2. **Task 2: Wire init to auto-run install-commands and run full test suite**
   - `2beaff3` (test) - Failing tests for init auto-install
   - `2fcaa42` (feat) - Implementation: init calls installSlashCommands

_Note: TDD tasks have RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `src/cli/install-commands.ts` - Refactored to import COMMANDS from barrel, added installSlashCommands/uninstallSlashCommands exports, dual-directory support
- `src/cli/index.ts` - Stripped to bootstrapper (init, install-commands) + utility commands (map-status, check-drift, detect-conflicts, status), version 2.0.0
- `src/cli/init.ts` - Added installSlashCommands call after init setup
- `package.json` - Version bumped from 1.2.0 to 2.0.0
- `vitest.config.ts` - Added markdown raw plugin for .md import support in vitest
- `tests/cli/install-commands.test.ts` - 14 tests for dual-directory install, uninstall, and CLI command registration
- `tests/cli/init.test.ts` - 3 new tests for init auto-install behavior

## Decisions Made
- Exported installSlashCommands/uninstallSlashCommands as standalone functions for reuse by init.ts (avoids code duplication between CLI command and init handler)
- Added vitest markdown raw plugin to handle .md file imports in test environment (tsup uses esbuild text loader at build time, but vitest/vite needs its own transform)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest markdown raw plugin**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** vitest could not import .md files from src/commands/index.ts (Rollup parse error on markdown frontmatter)
- **Fix:** Added a vite plugin to vitest.config.ts that transforms .md imports into default string exports
- **Files modified:** vitest.config.ts
- **Verification:** All 444 tests pass including .md-dependent imports
- **Committed in:** 712d960 (Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for test infrastructure to work with .md imports. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 complete: all slash commands extracted to .md files, CLI refactored to bootstrapper
- 14 slash commands install to both ~/.claude/commands/ and ~/.claude/skills/
- CLI version 2.0.0 with only init, install-commands, and utility commands
- Full test suite (444 tests) passing, build succeeds

---
*Phase: 10-slash-command-migration*
*Completed: 2026-03-10*
