---
phase: 09-github-issues-sync-and-roadmap-refresh
verified: 2026-03-10T13:29:00Z
status: passed
score: 11/11 must-haves verified
---

# Phase 9: GitHub Issues Sync and Roadmap Refresh Verification Report

**Phase Goal:** Users can push features to GitHub Issues for team coordination and refresh the roadmap when the PR-FAQ evolves
**Verified:** 2026-03-10T13:29:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | gh CLI availability and auth can be checked before any sync operation | VERIFIED | `checkGhAvailable()` in `src/github/index.ts` detects 3 states; 3 tests pass |
| 2 | Issues can be created and updated via gh CLI with proper argument safety | VERIFIED | `createIssue`/`updateIssue` in `src/github/issues.ts` use `ghExec` with args array (execFile, not exec); URL parsing tested |
| 3 | Labels and milestones are created idempotently | VERIFIED | `ensureLabel` uses `--force`; `ensureMilestone` checks existing before creating; both tested |
| 4 | Title similarity matching identifies renamed features during roadmap refresh | VERIFIED | `src/roadmap/similarity.ts` implements Levenshtein + normalized similarity + greedy matching; 14 tests pass |
| 5 | 'dropped' is a valid feature status | VERIFIED | `FEATURE_STATUSES` array in `src/roadmap/types.ts` includes 'dropped' at line 6 |
| 6 | User can run /branchos:sync-issues and GitHub Issues are created for each non-complete, non-dropped feature | VERIFIED | `syncIssuesHandler` in `src/cli/sync-issues.ts` filters complete/dropped, creates via `createIssue`; 9 tests pass |
| 7 | Re-running sync updates existing issues rather than creating duplicates | VERIFIED | Handler checks `feature.issue` -- null triggers create, non-null triggers update; tested |
| 8 | Issue numbers are stored in feature frontmatter after sync | VERIFIED | Handler writes updated features via `writeFeatureFile` after setting `feature.issue = result.number`; test verifies `writtenFeature.issue === 42` |
| 9 | Dry-run mode previews what would happen without making API calls | VERIFIED | `dryRun` flag skips `createIssue`/`updateIssue`/`writeFeatureFile`/`ensureStatusLabels`; test confirms no calls |
| 10 | Refresh preserves feature ID, status, issue number, and workstream link for matched features | VERIFIED | `refreshRoadmapHandler` copies `oldFeature.id`, `.status`, `.issue`, `.workstream` on matches; integration test reads back file and confirms `status: in-progress`, `issue: 10`, `workstream: ws-auth` |
| 11 | Features no longer in PR-FAQ get status 'dropped' | VERIFIED | `matchResult.dropped` features get `status: 'dropped'`; test reads back F-003 and confirms `status: dropped` |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/roadmap/types.ts` | FeatureStatus with 'dropped' | VERIFIED | 38 lines, 'dropped' present at line 6 |
| `src/github/index.ts` | gh CLI wrapper with ghExec, checkGhAvailable | VERIFIED | 33 lines, exports both functions, uses execFile |
| `src/github/issues.ts` | createIssue, updateIssue | VERIFIED | 90 lines, URL parsing, body-file for large bodies |
| `src/github/milestones.ts` | ensureMilestone | VERIFIED | 31 lines, checks existing before creating |
| `src/github/labels.ts` | ensureLabel, ensureStatusLabels | VERIFIED | 23 lines, --force flag, all 5 status colors |
| `src/roadmap/similarity.ts` | Levenshtein + title matching | VERIFIED | 101 lines, exports 3 functions |
| `src/cli/sync-issues.ts` | syncIssuesHandler, registerSyncIssuesCommand | VERIFIED | 305 lines, full handler with dry-run, rate limit retry |
| `src/cli/refresh-roadmap.ts` | refreshRoadmapHandler, registerRefreshRoadmapCommand | VERIFIED | 274 lines, full handler with confirmation, PR-FAQ re-ingestion |
| `tests/github/index.test.ts` | Tests for GitHub operations | VERIFIED | 13 tests, all pass |
| `tests/roadmap/similarity.test.ts` | Tests for similarity module | VERIFIED | 14 tests, all pass |
| `tests/cli/sync-issues.test.ts` | Tests for sync-issues handler | VERIFIED | 9 tests, all pass |
| `tests/cli/refresh-roadmap.test.ts` | Tests for refresh-roadmap handler | VERIFIED | 11 tests, all pass |
| `src/cli/index.ts` | Both commands registered | VERIFIED | Imports and calls both registerSyncIssuesCommand and registerRefreshRoadmapCommand |
| `src/cli/install-commands.ts` | Both slash commands | VERIFIED | 'branchos:sync-issues.md' and 'branchos:refresh-roadmap.md' entries present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/github/issues.ts` | `src/github/index.ts` | `import ghExec` | WIRED | Line 1: `import { ghExec } from './index.js'` |
| `src/github/milestones.ts` | `src/github/index.ts` | `import ghExec` | WIRED | Line 1: `import { ghExec } from './index.js'` |
| `src/github/labels.ts` | `src/github/index.ts` | `import ghExec` | WIRED | Line 1: `import { ghExec } from './index.js'` |
| `src/cli/sync-issues.ts` | `src/github/index.ts` | `import checkGhAvailable` | WIRED | Line 5 |
| `src/cli/sync-issues.ts` | `src/github/issues.ts` | `import createIssue, updateIssue` | WIRED | Line 6 |
| `src/cli/sync-issues.ts` | `src/roadmap/feature-file.ts` | `import readAllFeatures, writeFeatureFile` | WIRED | Line 9 |
| `src/cli/sync-issues.ts` | `src/github/labels.ts` | `import ensureStatusLabels` | WIRED | Line 7 |
| `src/cli/sync-issues.ts` | `src/github/milestones.ts` | `import ensureMilestone` | WIRED | Line 8 |
| `src/cli/refresh-roadmap.ts` | `src/roadmap/similarity.ts` | `import matchFeaturesByTitle` | WIRED | Line 9 |
| `src/cli/refresh-roadmap.ts` | `src/roadmap/feature-file.ts` | `import readAllFeatures, writeFeatureFile` | WIRED | Line 8 |
| `src/cli/refresh-roadmap.ts` | `src/prfaq/hash.ts` | `import readMeta, hashContent, writeMeta` | WIRED | Line 6 |
| `src/cli/index.ts` | `src/cli/sync-issues.ts` | `import registerSyncIssuesCommand` | WIRED | Line 15 |
| `src/cli/index.ts` | `src/cli/refresh-roadmap.ts` | `import registerRefreshRoadmapCommand` | WIRED | Line 16 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GHIS-01 | 09-01, 09-02 | User can create GitHub Issues from features via `/branchos:sync-issues` using `gh` CLI | SATISFIED | syncIssuesHandler creates issues via createIssue, slash command registered |
| GHIS-02 | 09-02 | Sync is idempotent -- re-running updates existing issues, stores issue number in frontmatter | SATISFIED | Handler checks feature.issue for create vs update; writeFeatureFile persists issue numbers |
| ROAD-04 | 09-01, 09-03 | User can refresh roadmap when PR-FAQ changes via `/branchos:refresh-roadmap` | SATISFIED | refreshRoadmapHandler matches by similarity, writes features, regenerates ROADMAP.md, slash command registered |
| ROAD-05 | 09-03 | Roadmap refresh preserves manual edits to feature files where possible | SATISFIED | Matched features keep id, status, issue, workstream, filename; only body/title updated from new data |

No orphaned requirements found -- all 4 requirement IDs (GHIS-01, GHIS-02, ROAD-04, ROAD-05) are accounted for in plans and REQUIREMENTS.md maps them to Phase 9.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | -- | -- | -- | No anti-patterns detected in any phase 9 files |

### Human Verification Required

### 1. sync-issues End-to-End with Real GitHub Repo

**Test:** Run `npx branchos sync-issues --dry-run` in a repo with features, then without --dry-run
**Expected:** Dry-run shows table of would-create entries; real run creates issues on GitHub, stores issue numbers in feature files
**Why human:** Requires real `gh` CLI authentication and a GitHub repo; cannot verify actual API calls programmatically

### 2. refresh-roadmap with Modified PR-FAQ

**Test:** Modify PR-FAQ.md, run `/branchos:refresh-roadmap`, review proposed changes, confirm
**Expected:** Shows summary of updated/new/dropped features, preserves existing metadata on matches, new features get sequential IDs
**Why human:** Requires actual PR-FAQ content changes and interactive confirmation flow

### Gaps Summary

No gaps found. All 11 observable truths verified. All 14 artifacts exist, are substantive, and are properly wired. All 4 requirements (GHIS-01, GHIS-02, ROAD-04, ROAD-05) are satisfied. All 47 tests pass. No anti-patterns detected.

---

_Verified: 2026-03-10T13:29:00Z_
_Verifier: Claude (gsd-verifier)_
