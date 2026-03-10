---
phase: 8
slug: feature-aware-workstreams
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest, via package.json) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/workstream/create.test.ts tests/context/assemble.test.ts -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/workstream/create.test.ts tests/context/assemble.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "feature" -x` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "feature branch" -x` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "in-progress" -x` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "not found" -x` | ❌ W0 | ⬜ pending |
| 08-01-05 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "already in-progress" -x` | ❌ W0 | ⬜ pending |
| 08-01-06 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/git/index.test.ts -t "branch" -x` | ❌ W0 | ⬜ pending |
| 08-01-07 | 01 | 1 | WORK-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "featureId" -x` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | WORK-02 | unit | `npx vitest run tests/context/assemble.test.ts -t "feature" -x` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | WORK-02 | unit | `npx vitest run tests/context/assemble.test.ts -t "non-feature" -x` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 1 | WORK-02 | unit | `npx vitest run tests/context/assemble.test.ts -t "featureContext" -x` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | WORK-01 | unit | `npx vitest run tests/workstream/archive.test.ts -t "feature" -x` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 2 | WORK-01 | unit | `npx vitest run tests/roadmap/frontmatter.test.ts -t "workstream" -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/workstream/create.test.ts` — add test cases for feature-linked creation, validation errors, bidirectional linking
- [ ] `tests/context/assemble.test.ts` — add test cases for featureContext section inclusion/exclusion
- [ ] `tests/workstream/archive.test.ts` — add test cases for feature completion prompt
- [ ] `tests/git/index.test.ts` — add test cases for `branchExists()` and `checkoutBranch()` methods
- [ ] `tests/roadmap/frontmatter.test.ts` — add test for `workstream` field in FIELD_ORDER

*Existing infrastructure covers framework setup — only new test cases needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive branch-exists prompt | WORK-01 | Requires TTY input | Run `branchos workstream create --feature F-001` when branch exists, verify prompt appears |
| Archive completion prompt | WORK-01 | Requires TTY input | Run `branchos workstream archive` on feature-linked workstream, verify prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
