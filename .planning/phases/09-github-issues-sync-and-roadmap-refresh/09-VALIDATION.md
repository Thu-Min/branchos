---
phase: 9
slug: github-issues-sync-and-roadmap-refresh
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/cli/sync-issues.test.ts tests/cli/refresh-roadmap.test.ts tests/roadmap/similarity.test.ts tests/github/index.test.ts -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/cli/sync-issues.test.ts tests/cli/refresh-roadmap.test.ts tests/roadmap/similarity.test.ts tests/github/index.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | GHIS-01 | unit (mock gh) | `npx vitest run tests/cli/sync-issues.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | GHIS-02 | unit (mock gh) | `npx vitest run tests/cli/sync-issues.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | ROAD-04 | unit | `npx vitest run tests/cli/refresh-roadmap.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | ROAD-05 | unit | `npx vitest run tests/cli/refresh-roadmap.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-00-01 | 00 | 0 | N/A | unit | `npx vitest run tests/roadmap/similarity.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-00-02 | 00 | 0 | N/A | unit (mock execFile) | `npx vitest run tests/github/index.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/cli/sync-issues.test.ts` — stubs for GHIS-01, GHIS-02
- [ ] `tests/cli/refresh-roadmap.test.ts` — stubs for ROAD-04, ROAD-05
- [ ] `tests/roadmap/similarity.test.ts` — title similarity matching tests
- [ ] `tests/github/index.test.ts` — gh CLI wrapper, auth check tests

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual GitHub issue creation | GHIS-01 | Requires live `gh` CLI and GitHub repo | Run `branchos sync-issues --dry-run` then without flag on test repo |
| Milestone creation via gh api | GHIS-01 | Requires live GitHub API | Verify milestones appear in GitHub UI after sync |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
