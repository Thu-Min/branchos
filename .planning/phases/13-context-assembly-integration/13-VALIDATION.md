---
phase: 13
slug: context-assembly-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project version) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/context/assemble.test.ts tests/cli/context.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/context/assemble.test.ts tests/cli/context.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | CTX-01 | unit | `npx vitest run tests/context/assemble.test.ts -t "researchSummaries"` | Exists (needs new tests) | pending |
| 13-01-02 | 01 | 1 | CTX-02 | unit | `npx vitest run tests/context/assemble.test.ts -t "researchSummaries"` | Exists (needs new tests) | pending |
| 13-01-03 | 01 | 1 | CTX-03 | unit | `npx vitest run tests/context/assemble.test.ts -t "researchSummaries"` | Exists (covered by null test) | pending |
| 13-02-01 | 02 | 1 | RES-01 | integration | `npx vitest run tests/cli/context.test.ts` | Exists (needs new test) | pending |
| 13-02-02 | 02 | 1 | RES-02 | manual-only | N/A (slash command markdown update) | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New test cases are added to existing test files, not new files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| plan-roadmap includes research context | RES-02 | Slash command markdown update — behavior depends on Claude interpreting instructions | 1. Create research artifact in `.branchos/shared/research/` 2. Run `/branchos:plan-roadmap` 3. Verify Claude references research findings |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
