---
phase: 10-slash-command-migration
plan: 01
subsystem: cli
tags: [slash-commands, tsup, esbuild, markdown, bundling]

# Dependency graph
requires:
  - phase: 09-github-issues-sync
    provides: "10 existing slash command string literals in install-commands.ts"
provides:
  - "14 .md slash command files in commands/ directory"
  - "src/commands/index.ts barrel export with COMMANDS record"
  - "tsup .md text loader configuration"
  - "TypeScript declaration for .md imports"
affects: [10-02-PLAN, install-commands]

# Tech tracking
tech-stack:
  added: []
  patterns: [".md-based slash command architecture", "esbuild text loader for markdown bundling"]

key-files:
  created:
    - commands/branchos:create-workstream.md
    - commands/branchos:list-workstreams.md
    - commands/branchos:status.md
    - commands/branchos:archive.md
    - src/commands/index.ts
    - src/commands/markdown.d.ts
    - tests/commands/index.test.ts
  modified:
    - tsup.config.ts
    - commands/branchos:map-codebase.md
    - commands/branchos:context.md
    - commands/branchos:discuss-phase.md
    - commands/branchos:plan-phase.md
    - commands/branchos:execute-phase.md
    - commands/branchos:ingest-prfaq.md
    - commands/branchos:plan-roadmap.md
    - commands/branchos:features.md
    - commands/branchos:sync-issues.md
    - commands/branchos:refresh-roadmap.md

key-decisions:
  - "Character-by-character template literal unescaping for faithful .md extraction"
  - "Escaped backticks preserved in extracted .md files (matches runtime install-commands output)"

patterns-established:
  - "Slash commands as individual .md files in commands/ directory at repo root"
  - "Barrel export pattern: src/commands/index.ts imports all .md files and re-exports as COMMANDS record"

requirements-completed: [MIGR-01]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 10 Plan 01: Slash Command Migration Summary

**Extracted 10 slash commands from string literals to .md files, created 4 new commands, and set up tsup markdown bundling with barrel export**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T08:06:49Z
- **Completed:** 2026-03-10T08:11:07Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Extracted all 10 existing slash commands from install-commands.ts string literals to individual .md files with proper template literal unescaping
- Created 4 new slash command .md files: create-workstream, list-workstreams, status (consolidated dashboard), archive
- Set up tsup .md text loader, TypeScript declaration, and barrel export with 14 COMMANDS entries
- Added comprehensive test suite (47 tests) validating file existence, frontmatter structure, and content requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract existing slash commands to .md files and create 4 new commands** - `a327de9` (feat)
2. **Task 2: Set up tsup .md loader, TypeScript declaration, and barrel export** - `1a354ad` (feat)

## Files Created/Modified
- `commands/branchos:*.md` (14 files) - Individual slash command markdown files
- `src/commands/index.ts` - Barrel export with COMMANDS record mapping 14 filenames to content
- `src/commands/markdown.d.ts` - TypeScript declaration for .md default imports
- `tsup.config.ts` - Added `.md: 'text'` loader for esbuild bundling
- `tests/commands/index.test.ts` - 47 tests validating .md file structure and content

## Decisions Made
- Character-by-character template literal unescaping to faithfully reproduce install-commands runtime output (handles `\\`, `\``, `\$` sequences correctly)
- Preserved escaped backticks (`\``) in extracted .md files since that matches what the original install-commands would write to disk

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 14 .md command files ready for Plan 02 to wire into the CLI install-commands flow
- src/commands/index.ts COMMANDS record ready to replace string literals in install-commands.ts
- tsup successfully bundles .md files as text strings

## Self-Check: PASSED

All 17 files verified present. Both task commits (a327de9, 1a354ad) verified in git log.

---
*Phase: 10-slash-command-migration*
*Completed: 2026-03-10*
