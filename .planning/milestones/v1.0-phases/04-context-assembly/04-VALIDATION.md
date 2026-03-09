---
phase: 4
slug: context-assembly
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/context` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/context`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CTX-01, CTX-02, CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts tests/cli/context.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CTX-01 | unit | `npx vitest run tests/context/assemble.test.ts -t "assembles"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | CTX-01 | unit | `npx vitest run tests/context/assemble.test.ts -t "missing"` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "detectStep"` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "discuss"` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "plan"` | ❌ W0 | ⬜ pending |
| 04-01-07 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "execute"` | ❌ W0 | ⬜ pending |
| 04-01-08 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "fallback"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | CTX-02 | unit | `npx vitest run tests/cli/context.test.ts -t "context"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | CTX-02 | unit | `npx vitest run tests/cli/context.test.ts -t "json"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/context/assemble.test.ts` — stubs for CTX-01 (assembly), CTX-03 (step detection, section composition per step)
- [ ] `tests/cli/context.test.ts` — stubs for CTX-02 (CLI registration, handler, --json output)
- [ ] `tests/git/index.test.ts` — stubs for new GitOps methods (getMergeBase, getDiffNameStatus, getDiffStat) — extend existing file

*Wave 0 creates test stubs; implementation fills them in during Wave 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slash command `/context` works in Claude Code | CTX-02 | Requires Claude Code runtime | Run `/context` in Claude Code session, verify output matches expected sections |
| Hint lines appear in existing slash commands | CTX-02 | Static file content | Inspect `.claude/commands/discuss-phase.md`, `plan-phase.md`, `execute-phase.md` for hint line |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
