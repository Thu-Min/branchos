---
phase: 12
slug: interactive-research-command
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/commands/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/commands/ tests/cli/install-commands.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INT-01 | unit | `npx vitest run tests/commands/index.test.ts -x` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | INT-01 | unit | `npx vitest run tests/commands/research-command.test.ts -x` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | INT-02 | unit | `npx vitest run tests/commands/research-command.test.ts -x` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | INT-03 | unit | `npx vitest run tests/commands/research-command.test.ts -x` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 1 | INT-01 | unit | `npx vitest run tests/cli/install-commands.test.ts -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/commands/research-command.test.ts` — validates command file content (AskUserQuestion in allowed-tools, structured options, freeform Other, adaptive instructions, --save handling, Summary section mandate)
- [ ] Update `tests/commands/index.test.ts` — EXPECTED_FILES array needs `branchos:research.md`, count from 14 to 15
- [ ] Update `tests/cli/install-commands.test.ts` — count expectations from 14 to 15

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive research flow adapts based on user responses | INT-03 | Requires human-in-the-loop conversation | Invoke `/branchos:research <topic>`, verify Claude asks adaptive follow-ups |
| Freeform follow-up accepted when structured options insufficient | INT-02 | Requires user typing freeform text | Select "Other" in AskUserQuestion, verify Claude processes freeform response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
