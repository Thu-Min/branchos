---
phase: 15
slug: gwt-acceptance-criteria
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/roadmap/gwt-parser.test.ts tests/cli/context.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/roadmap/gwt-parser.test.ts tests/cli/context.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | AC-01, AC-02, AC-03 | unit stub | `npx vitest run tests/roadmap/gwt-parser.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | AC-01 | unit | `npx vitest run tests/roadmap/gwt-parser.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | AC-02 | unit | `npx vitest run tests/roadmap/gwt-parser.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | AC-03 | unit | `npx vitest run tests/roadmap/gwt-parser.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | AC-05 | unit | `npx vitest run tests/cli/context.test.ts` | ✅ (needs cases) | ⬜ pending |
| 15-02-02 | 02 | 1 | AC-04 | manual-only | Verify slash command instructions | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/roadmap/gwt-parser.test.ts` — stubs for AC-01, AC-02, AC-03
- [ ] New test cases in `tests/cli/context.test.ts` — stubs for AC-05 (GWT in context packets)

*Wave 0 creates test stubs that fail, then implementation tasks make them pass.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| plan-roadmap generates GWT format | AC-04 | Slash command text, not executable code | Verify `commands/branchos:plan-roadmap.md` contains GWT template with Given/When/Then format and 2-4 AC blocks per feature rule |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
