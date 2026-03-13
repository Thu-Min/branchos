---
phase: 16
slug: assignee-capture-schema-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest, from package.json) |
| **Config file** | package.json `scripts.test` = `vitest run` |
| **Quick run command** | `npx vitest run tests/state/schema.test.ts tests/state/meta.test.ts tests/github/index.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/state/schema.test.ts tests/state/meta.test.ts tests/github/index.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | ASN-05 | unit | `npx vitest run tests/state/schema.test.ts -t "v2 to v3"` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | ASN-02 | unit | `npx vitest run tests/state/meta.test.ts -t "assignee"` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | ASN-01, ASN-04 | unit | `npx vitest run tests/github/index.test.ts -t "captureAssignee"` | ❌ W0 | ⬜ pending |
| 16-01-04 | 01 | 1 | ASN-01 | integration | `npx vitest run tests/workstream/create.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/github/index.test.ts` — add `captureAssignee` describe block (covers ASN-01, ASN-04)
- [ ] `tests/state/meta.test.ts` — add tests for assignee and issueNumber in createMeta output (covers ASN-02)
- [ ] `tests/state/schema.test.ts` — add v2-to-v3 migration tests (covers ASN-05)
- [ ] `tests/workstream/create.test.ts` — add mock for captureAssignee in integration tests (covers ASN-01 integration)

*Existing infrastructure covers framework/runner needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Console warning when gh not installed | ASN-04 | Console output verification | Run `create-workstream` without gh CLI installed, verify warning message appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
