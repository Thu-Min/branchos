---
phase: 5
slug: team-coordination
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 0 | WRK-03 | unit | `npx vitest run tests/workstream/status.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 0 | WRK-03 | unit | `npx vitest run tests/cli/status.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 0 | WRK-04 | unit | `npx vitest run tests/workstream/archive.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 0 | WRK-04 | unit | `npx vitest run tests/cli/archive.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-05 | 01 | 0 | WRK-05 | unit | `npx vitest run tests/workstream/prompt.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-06 | 01 | 0 | TEM-01 | unit | `npx vitest run tests/workstream/conflicts.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-07 | 01 | 0 | TEM-01 | unit | `npx vitest run tests/cli/detect-conflicts.test.ts -x` | ❌ W0 | ⬜ pending |
| 05-01-08 | 01 | 0 | TEM-02 | unit | `npx vitest run tests/workstream/conflicts.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/workstream/status.test.ts` — stubs for WRK-03 data gathering
- [ ] `tests/workstream/conflicts.test.ts` — stubs for TEM-01, TEM-02
- [ ] `tests/workstream/archive.test.ts` — stubs for WRK-04
- [ ] `tests/workstream/prompt.test.ts` — stubs for WRK-05
- [ ] `tests/cli/status.test.ts` — stubs for WRK-03 CLI
- [ ] `tests/cli/detect-conflicts.test.ts` — stubs for TEM-01 CLI
- [ ] `tests/cli/archive.test.ts` — stubs for WRK-04 CLI

*Existing infrastructure covers test framework — vitest already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Branch-switch prompt interactive flow | WRK-05 | Requires TTY interaction | Run `branchos context` on a branch with no workstream, verify prompt appears and y/n works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
