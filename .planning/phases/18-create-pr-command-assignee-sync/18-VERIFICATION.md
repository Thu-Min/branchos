---
phase: 18-create-pr-command-assignee-sync
verified: 2026-03-13T16:55:00Z
status: passed
score: 12/12 must-haves verified
gaps: []
human_verification:
  - test: "Run npx branchos create-pr --dry-run in a workstream with a linked feature"
    expected: "Prints [F-XX] Feature Title and assembled PR body with description, GWT checklist, Closes #N"
    why_human: "Requires a real workstream, feature file, and linked issue to exercise the live path"
  - test: "Run npx branchos create-pr in a workstream with branch not yet pushed to origin"
    expected: "Prints 'Pushing branch to origin...' then creates the PR successfully"
    why_human: "Auto-push path requires a real git remote; cannot verify programmatically"
  - test: "Run /branchos:create-pr slash command in Claude Code"
    expected: "Shows PR preview, asks 'Create PR' / 'Cancel' via AskUserQuestion, creates PR on confirmation"
    why_human: "Slash command confirmation flow uses Claude Code AskUserQuestion; cannot verify in isolation"
---

# Phase 18: Create-PR Command & Assignee Sync Verification Report

**Phase Goal:** Implement create-pr command and assignee sync for sync-issues
**Verified:** 2026-03-13T16:55:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | assemblePrBody returns markdown with feature description, GWT checklist, and Closes #N | VERIFIED | src/github/pr.ts:19-40; 5 unit tests in tests/github/pr.test.ts all pass |
| 2 | checkExistingPr returns existing PR info or null | VERIFIED | src/github/pr.ts:45-56; 2 tests pass covering both branches |
| 3 | createPr writes body to temp file and calls gh pr create with --body-file | VERIFIED | src/github/pr.ts:61-91; 5 tests verify temp file write, arg shape, cleanup in finally |
| 4 | createPrHandler errors when no feature linked, no commits ahead, or gh unavailable | VERIFIED | src/cli/create-pr.ts:32-77; 5 tests cover all error cases |
| 5 | createPrHandler auto-pushes branch if not on remote | VERIFIED | src/cli/create-pr.ts:121-128; test "auto-pushes when branch not on remote" passes |
| 6 | createPrHandler shows assembled body and prompts for confirmation | VERIFIED | dry-run path at create-pr.ts:101-108; slash command wraps with AskUserQuestion |
| 7 | Duplicate PR detection prevents creating a second PR for the same branch | VERIFIED | create-pr.ts:73-77 + checkExistingPr; test "aborts and shows URL when PR already exists" passes |
| 8 | PR is assigned to workstream assignee with late-capture fallback | VERIFIED | create-pr.ts:111-118; test "uses captureAssignee() fallback when meta.assignee is null" passes |
| 9 | sync-issues sets assignee on GitHub Issues from workstream metadata | VERIFIED | sync-issues.ts:264-277; tests "calls gh issue edit --add-assignee after creating/updating issue" pass |
| 10 | Assignee is add-only -- existing GitHub assignees are never removed | VERIFIED | sync-issues.ts:271 uses --add-assignee flag exclusively; no remove path exists |
| 11 | Features without a matching workstream or without an assignee are silently skipped | VERIFIED | findAssigneeForFeature returns null; caller checks before calling ghExec; test confirms no gh call |
| 12 | Assignee sync works for both created and updated issues | VERIFIED | sync-issues.ts:264-277 is outside the create/update branch; runs for both; two separate tests confirm |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/github/pr.ts` | assemblePrBody, checkExistingPr, createPr, getDefaultBranch | VERIFIED | 101 lines; all 4 functions exported and substantive |
| `src/cli/create-pr.ts` | createPrHandler, registerCreatePrCommand | VERIFIED | 169 lines; full validation flow, dry-run, auto-push, assignee fallback |
| `.claude/commands/branchos:create-pr.md` | Slash command with dry-run + AskUserQuestion confirmation | VERIFIED | File exists; correct allowed-tools, two-step flow present |
| `tests/github/pr.test.ts` | Unit tests for PR module | VERIFIED | 17 tests; all pass |
| `tests/cli/create-pr.test.ts` | Unit tests for create-pr handler | VERIFIED | 13 tests; all pass |
| `src/git/index.ts` | getCommitsAhead and push methods added | VERIFIED | Lines 120-131; both methods present and tested |
| `src/cli/index.ts` | registerCreatePrCommand wired | VERIFIED | Line 13 import + line 36 call confirmed |
| `src/cli/sync-issues.ts` | findAssigneeForFeature + assignee propagation | VERIFIED | Lines 53-78 helper; lines 264-277 propagation in handler loop |
| `tests/cli/sync-issues.test.ts` | Tests for assignee propagation | VERIFIED | 11 new tests in two new describe blocks; all pass |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/cli/create-pr.ts | src/github/pr.ts | imports assemblePrBody, checkExistingPr, createPr, getDefaultBranch | WIRED | Line 5: `import { assemblePrBody, checkExistingPr, createPr, getDefaultBranch } from '../github/pr.js'` |
| src/cli/create-pr.ts | src/state/meta.ts | readMeta for assignee and featureId | WIRED | Line 6: `import { readMeta } from '../state/meta.js'`; used at line 48 |
| src/cli/create-pr.ts | src/roadmap/gwt-parser.ts | parseAcceptanceCriteria for GWT data | WIRED | Line 8: `import { parseAcceptanceCriteria } from '../roadmap/gwt-parser.js'`; used at line 86 |
| src/cli/index.ts | src/cli/create-pr.ts | registerCreatePrCommand(program) | WIRED | Line 13 import; line 36 call |
| src/cli/sync-issues.ts | src/state/meta.ts | readMeta for workstream assignee lookup | WIRED | Line 10: `import { readMeta } from '../state/meta.js'`; used in findAssigneeForFeature at line 67 |
| src/cli/sync-issues.ts | src/github/index.ts | ghExec for gh issue edit --add-assignee | WIRED | Line 5: `import { ..., ghExec } from '../github/index.js'`; used at line 271 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PR-01 | 18-01 | Developer can create a GitHub PR via /branchos:create-pr | SATISFIED | Slash command file exists; CLI command registered |
| PR-02 | 18-01 | PR body includes feature description | SATISFIED | assemblePrBody uses featureDescription; create-pr.ts:80-83 extracts it |
| PR-03 | 18-01 | PR body includes phase summaries | NOTE: INTENTIONALLY EXCLUDED | CONTEXT.md explicitly states "No phase summaries"; plan notes "satisfied by exclusion per user decision". REQUIREMENTS.md marks [x] but the feature was intentionally not built. |
| PR-04 | 18-01 | PR body includes acceptance criteria as GWT checklist | SATISFIED | assemblePrBody calls formatGwtChecklist; tested in 5 assemblePrBody tests |
| PR-05 | 18-01 | PR body includes Closes #N when issue exists | SATISFIED | assemblePrBody:35-37 appends Closes #N when issueNumber non-null |
| PR-06 | 18-01 | PR body includes branch diff stats | NOTE: INTENTIONALLY EXCLUDED | CONTEXT.md explicitly states "No diff stats"; plan notes "satisfied by exclusion per user decision". REQUIREMENTS.md marks [x] but the feature was intentionally not built. |
| PR-07 | 18-01 | PR auto-assigned to workstream creator's GitHub username | SATISFIED | create-pr.ts:111-118; meta.assignee with captureAssignee() fallback |
| PR-08 | 18-01 | PR targets repo default branch | SATISFIED | getDefaultBranch() call at create-pr.ts:64; passed to createPr as baseBranch |
| PR-09 | 18-01 | Confirmation flow shows assembled PR body before submitting | SATISFIED | dry-run prints title + body; slash command wraps with AskUserQuestion |
| PR-10 | 18-01 | Idempotency check prevents duplicate PRs | SATISFIED | checkExistingPr at create-pr.ts:73-77; aborts with existing URL |
| PR-11 | 18-01 | PR body written via --body-file not inline --body | SATISFIED | createPr writes temp file, passes --body-file flag; verified in tests |
| ASN-03 | 18-02 | sync-issues sets assignee on GitHub Issues from workstream assignee | SATISFIED | findAssigneeForFeature + ghExec --add-assignee in sync-issues.ts |

### Requirements Discrepancy Note

PR-03 and PR-06 are marked `[x]` complete in REQUIREMENTS.md but the actual features (phase summaries in PR body; diff stats in PR body) were explicitly decided NOT to implement. The CONTEXT.md states "No phase summaries, no diff stats — keep it tight" and the PLAN states these are "satisfied by exclusion -- assemblePrBody does not include them per user decision." REQUIREMENTS.md should be updated to reflect that these were descoped, not completed. This is a documentation issue only — the code is correct per the stated design intent.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/git/index.ts | 7 | Pre-existing TS2349 error on simpleGit() call | INFO | Pre-dates phase 18 (present since commit 681d482); documented in 18-01 SUMMARY as known tech debt; runtime works correctly |

No blockers or warnings found in phase 18 artifacts. All key implementation files are substantive — no stubs, no empty handlers, no placeholder returns.

---

## Human Verification Required

### 1. Live dry-run smoke test

**Test:** In a real workstream with a linked feature and an open issue, run `npx branchos create-pr --dry-run`
**Expected:** Prints the formatted title `[F-XX] Feature Title` followed by assembled PR body containing the feature description, GWT checklist block, and `Closes #N`
**Why human:** Requires real workstream meta, feature files, and git state — cannot fabricate all layers programmatically

### 2. Auto-push flow

**Test:** On a branch that has commits but has not been pushed to origin, run `npx branchos create-pr`
**Expected:** Prints "Pushing branch to origin..." then proceeds to create the PR
**Why human:** Requires a real git remote with credentials; mock layer verifies code path but not real push behavior

### 3. Slash command confirmation flow

**Test:** Open Claude Code in a valid workstream, run `/branchos:create-pr`
**Expected:** Shows PR preview output, then AskUserQuestion dialog with "Create PR" and "Cancel" options; choosing "Create PR" creates the PR and reports the URL
**Why human:** AskUserQuestion is a Claude Code runtime behavior; cannot verify tool invocation order outside that environment

---

## Test Suite Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| tests/github/pr.test.ts | 17 | All pass |
| tests/cli/create-pr.test.ts | 13 | All pass |
| tests/cli/sync-issues.test.ts | 20 (9 existing + 11 new) | All pass |
| Full suite | 626 | All pass (no regressions) |

---

## Conclusion

Phase 18 goal achieved. Both plans executed cleanly:

- Plan 01 delivered the complete create-pr command: pure PR body assembly, gh CLI wrapper with --body-file, full CLI handler with 6-point validation, auto-push, assignee late-capture, dry-run flag, slash command, and CLI registration.
- Plan 02 delivered assignee propagation in sync-issues: findAssigneeForFeature helper with alphabetical determinism, add-only --add-assignee wiring, warning-on-failure behavior, dry-run skip, and full test coverage.

One documentation issue to note: PR-03 and PR-06 are marked complete in REQUIREMENTS.md but were intentionally descoped per product decision in CONTEXT.md. The code correctly excludes these features; the requirements file should be updated to reflect the descope.

All 626 tests pass. TypeScript TS2349 error is pre-existing tech debt unrelated to this phase.

---

_Verified: 2026-03-13T16:55:00Z_
_Verifier: Claude (gsd-verifier)_
