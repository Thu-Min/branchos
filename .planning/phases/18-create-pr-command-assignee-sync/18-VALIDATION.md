---
phase: 18
slug: create-pr-command-assignee-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/github/pr.test.ts tests/cli/create-pr.test.ts -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/github/pr.test.ts tests/cli/create-pr.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | PR-02, PR-04, PR-05, PR-08, PR-10, PR-11 | unit | `npx vitest run tests/github/pr.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | PR-01, PR-07, PR-09 | unit | `npx vitest run tests/cli/create-pr.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-02-01 | 02 | 1 | ASN-03 | unit | `npx vitest run tests/cli/sync-issues.test.ts -x` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/github/pr.test.ts` — stubs for PR-02, PR-04, PR-05, PR-08, PR-10, PR-11 (assemblePrBody, createPr, checkExistingPr)
- [ ] `tests/cli/create-pr.test.ts` — stubs for PR-01, PR-07, PR-09 (createPrHandler integration)
- [ ] New tests in `tests/cli/sync-issues.test.ts` — stubs for ASN-03 (assignee propagation)
- [ ] No new framework install needed — vitest already configured

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slash command renders in Claude Code | PR-01 | Requires Claude Code runtime | Invoke `/branchos:create-pr` in Claude Code session |
| AskUserQuestion confirmation flow | PR-09 | Requires interactive Claude session | Verify title+body display and Create/Cancel options shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
