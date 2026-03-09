---
phase: 3
slug: workflow-phases
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | WFL-01, WFL-05 | unit | `npx vitest run tests/phase/index.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 0 | WFL-06 | unit | `npx vitest run tests/phase/drift.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 0 | TEM-03 | unit | `npx vitest run tests/phase/decisions.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 0 | WFL-06 | unit | `npx vitest run tests/cli/check-drift.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-xx-xx | xx | 1 | WFL-01 | unit | `npx vitest run tests/phase/index.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-xx-xx | xx | 1 | WFL-02 | integration | `npx vitest run tests/phase/discuss.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-xx-xx | xx | 1 | WFL-03 | integration | `npx vitest run tests/phase/plan.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-xx-xx | xx | 1 | WFL-04 | integration | `npx vitest run tests/phase/execute.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-xx-xx | xx | 2 | WFL-06 | unit | `npx vitest run tests/phase/drift.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase/index.test.ts` — stubs for WFL-01, WFL-05 (phase lifecycle, directory creation, state management)
- [ ] `tests/phase/drift.test.ts` — stubs for WFL-06 (drift categorization, file parsing, git diff integration)
- [ ] `tests/phase/decisions.test.ts` — stubs for TEM-03 (decision entry formatting, append behavior)
- [ ] `tests/cli/check-drift.test.ts` — stubs for WFL-06 CLI layer (handler export, --json flag, output formatting)
- [ ] `tests/state/schema.test.ts` — add v1->v2 migration test cases (file exists, needs extension)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| discuss-phase slash command produces correct markdown via AI | WFL-02 | AI-generated content cannot be unit tested | Run `/discuss-phase` in Claude Code, verify discuss.md sections |
| plan-phase slash command produces correct markdown via AI | WFL-03 | AI-generated content cannot be unit tested | Run `/plan-phase` in Claude Code, verify plan.md sections |
| execute-phase slash command produces correct markdown via AI | WFL-04 | AI-generated content cannot be unit tested | Run `/execute-phase` in Claude Code, verify execute.md sections |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
