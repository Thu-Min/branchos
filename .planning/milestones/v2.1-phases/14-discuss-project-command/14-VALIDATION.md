---
phase: 14
slug: discuss-project-command
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/commands/discuss-project-command.test.ts tests/commands/index.test.ts` |
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
| 14-01-01 | 01 | 0 | DISC-01 | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | DISC-01, DISC-02 | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | DISC-03 | unit | `npx vitest run tests/commands/index.test.ts tests/cli/install-commands.test.ts -x` | ✅ (needs update) | ⬜ pending |
| 14-01-04 | 01 | 1 | DISC-03 | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/commands/discuss-project-command.test.ts` — validates command file content (AskUserQuestion in allowed-tools, section references, bookend pattern, save flow, ingest-prfaq delegation)
- [ ] Update `tests/commands/index.test.ts` — EXPECTED_FILES array needs `branchos:discuss-project.md`, count from 15 to 16
- [ ] Update `tests/cli/install-commands.test.ts` — count expectations from 15 to 16 (in 4 places)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive conversation flows naturally through PR-FAQ sections | DISC-01 | Requires real Claude interaction | Run `/branchos:discuss-project`, verify Claude guides through all 8 sections |
| Bookend pattern feels natural (opening context, closing save) | DISC-02 | UX quality assessment | Run command, verify framing at start and explicit save at end |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
