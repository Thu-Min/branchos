---
phase: 17
slug: issue-linked-workstreams
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest, configured in vitest.config.ts) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | ISS-01 | unit | `npx vitest run tests/github/issues.test.ts -t "fetchIssue" -x` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | ISS-01 | unit | `npx vitest run tests/cli/workstream.test.ts -t "issue" -x` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | ISS-01 | unit | `npx vitest run tests/workstream/create.test.ts -t "mutually exclusive" -x` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | ISS-02 | unit | `npx vitest run tests/workstream/create.test.ts -t "issue number" -x` | ❌ W0 | ⬜ pending |
| 17-01-05 | 01 | 1 | ISS-02 | unit | `npx vitest run tests/workstream/create.test.ts -t "title similarity" -x` | ❌ W0 | ⬜ pending |
| 17-01-06 | 01 | 1 | ISS-02 | unit | `npx vitest run tests/workstream/create.test.ts -t "no feature" -x` | ❌ W0 | ⬜ pending |
| 17-01-07 | 01 | 1 | ISS-02 | unit | `npx vitest run tests/workstream/create.test.ts -t "feature-linked" -x` | ❌ W0 | ⬜ pending |
| 17-01-08 | 01 | 1 | ISS-03 | unit | `npx vitest run tests/workstream/issue-file.test.ts -x` | ❌ W0 | ⬜ pending |
| 17-01-09 | 01 | 1 | ISS-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "issue" -x` | ❌ W0 | ⬜ pending |
| 17-01-10 | 01 | 1 | ISS-03 | unit | `npx vitest run tests/workstream/create.test.ts -t "issueNumber" -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/github/issues.test.ts` — add `fetchIssue` describe block for ISS-01
- [ ] `tests/cli/workstream.test.ts` — add `--issue` flag parsing tests for ISS-01
- [ ] `tests/workstream/create.test.ts` — add issue-linked creation tests for ISS-01, ISS-02, ISS-03
- [ ] `tests/workstream/issue-file.test.ts` — new file for issue.md write tests for ISS-03
- [ ] `tests/context/assemble.test.ts` — add issue context section tests for ISS-03

*Existing infrastructure covers framework setup; only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `gh issue view` returns data from real GitHub | ISS-01 | Requires GitHub auth and real repo | Run `branchos create-workstream --issue 1` against test repo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
