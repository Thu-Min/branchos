---
phase: 17-issue-linked-workstreams
plan: 01
subsystem: workstream
tags: [github-issues, gh-cli, context-packets, feature-linking, yaml-frontmatter]

# Dependency graph
requires:
  - phase: 16-assignee-capture-schema-migration
    provides: meta.issueNumber field (schema v3), captureAssignee pattern
provides:
  - fetchIssue helper for GitHub issue data retrieval via gh CLI
  - findFeatureByIssue two-tier reverse-lookup (exact issue number, title similarity 0.8)
  - writeIssueFile/readIssueFile for issue.md YAML frontmatter round-trip
  - issue-linked workstream creation path via --issue flag
  - Issue Context section in context packets
  - meta.issueNumber population on workstream creation
affects: [18-create-pr]

# Tech tracking
tech-stack:
  added: []
  patterns: [issue-file-frontmatter, two-tier-feature-lookup, context-section-extension]

key-files:
  created:
    - src/workstream/issue-file.ts
    - tests/github/issues.test.ts
    - tests/workstream/issue-file.test.ts
    - tests/cli/workstream.test.ts
  modified:
    - src/github/issues.ts
    - src/workstream/create.ts
    - src/state/meta.ts
    - src/context/assemble.ts
    - src/cli/workstream.ts
    - src/cli/context.ts
    - tests/context/assemble.test.ts

key-decisions:
  - "Single gh CLI JSON call for fetchIssue (--json body returns raw markdown, plain call returns terminal-formatted output)"
  - "findFeatureByIssue placed in create.ts near its consumer rather than separate file"
  - "issue.md uses stringifyGenericFrontmatter/parseGenericFrontmatter for consistency with feature files"
  - "Issue-linked flow delegates to createFeatureLinkedWorkstream with follow-up commit for issue.md"

patterns-established:
  - "Issue file format: YAML frontmatter (number, title, labels, url) + markdown body in workstream directory"
  - "Context section extension: add field to AssemblyInput, add to STEP_SECTIONS, add getSection case, add skip condition"

requirements-completed: [ISS-01, ISS-02, ISS-03]

# Metrics
duration: 7min
completed: 2026-03-13
---

# Phase 17 Plan 01: Issue-Linked Workstreams Summary

**Issue-linked workstream creation via `--issue #N` with two-tier feature reverse-lookup, issue.md persistence, and Issue Context in context packets**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-13T07:48:04Z
- **Completed:** 2026-03-13T07:55:26Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- `create-workstream --issue 42` fetches GitHub issue, reverse-looks-up feature, delegates to feature-linked flow, writes issue.md, populates meta.issueNumber
- Two-tier feature matching: exact issue number first, title similarity (0.8 threshold) second
- Context packets include separate "Issue Context" section with title, labels, and body when issue.md exists
- CLI validates issue numbers, strips `#` prefix, enforces mutual exclusivity with `--feature`

## Task Commits

Each task was committed atomically:

1. **Task 1: fetchIssue helper, findFeatureByIssue reverse-lookup, and issue-file utilities** - `7c66726` (feat)
2. **Task 2: Wire issue path into createWorkstream, CLI flag, createMeta issueNumber, and context assembly** - `4f2091a` (feat)

## Files Created/Modified
- `src/github/issues.ts` - Added fetchIssue function and IssueData interface
- `src/workstream/issue-file.ts` - New file: writeIssueFile/readIssueFile for issue.md YAML frontmatter
- `src/workstream/create.ts` - Added issue-linked path, findFeatureByIssue, mutual exclusivity check
- `src/state/meta.ts` - Added issueNumber parameter to createMeta
- `src/context/assemble.ts` - Added issueContext to AssemblyInput and all STEP_SECTIONS
- `src/cli/workstream.ts` - Added --issue flag with validation and # stripping
- `src/cli/context.ts` - Added issue.md reading and issueContext formatting
- `tests/github/issues.test.ts` - New file: fetchIssue and findFeatureByIssue tests
- `tests/workstream/issue-file.test.ts` - New file: writeIssueFile/readIssueFile round-trip tests
- `tests/cli/workstream.test.ts` - New file: --issue flag parsing, validation, mutual exclusivity tests
- `tests/context/assemble.test.ts` - Added issueContext section tests

## Decisions Made
- Used single `gh issue view --json title,body,labels,url` call instead of CONTEXT.md's two-call approach. RESEARCH.md confirmed `--json body` returns raw markdown while plain `gh issue view` returns terminal-formatted output.
- Placed `findFeatureByIssue` in `create.ts` near its consumer rather than a separate utility file.
- Used `stringifyGenericFrontmatter`/`parseGenericFrontmatter` for issue.md for consistency with feature file patterns.
- Issue-linked flow writes issue.md as a follow-up commit after `createFeatureLinkedWorkstream` completes, keeping the existing function's commit atomic.

## Deviations from Plan

None - plan executed exactly as written. The single-JSON-call deviation from CONTEXT.md was already accepted and documented in the plan itself.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- meta.issueNumber is now populated for issue-linked workstreams, ready for Phase 18 (create-pr) to use for `Closes #N` in PR body
- Full test suite passes (585 tests, 0 failures)

## Self-Check: PASSED

All 11 files verified present. Both task commits (7c66726, 4f2091a) verified in git log.

---
*Phase: 17-issue-linked-workstreams*
*Completed: 2026-03-13*
