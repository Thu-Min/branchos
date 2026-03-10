---
phase: 6
slug: pr-faq-ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | package.json type:module (implicit config) |
| **Quick run command** | `npx vitest run tests/cli/ingest-prfaq.test.ts tests/prfaq/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/cli/ingest-prfaq.test.ts tests/prfaq/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | PRFAQ-02 | unit | `npx vitest run tests/prfaq/validate.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 0 | PRFAQ-03 | unit | `npx vitest run tests/prfaq/hash.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 0 | PRFAQ-01 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | PRFAQ-01 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "copies PR-FAQ"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | PRFAQ-01 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "auto-commit"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | PRFAQ-01 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "missing file"` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 1 | PRFAQ-02 | unit | `npx vitest run tests/prfaq/validate.test.ts -t "detects sections"` | ❌ W0 | ⬜ pending |
| 06-02-05 | 02 | 1 | PRFAQ-02 | unit | `npx vitest run tests/prfaq/validate.test.ts -t "warns missing"` | ❌ W0 | ⬜ pending |
| 06-02-06 | 02 | 1 | PRFAQ-02 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "confirmation"` | ❌ W0 | ⬜ pending |
| 06-02-07 | 02 | 1 | PRFAQ-03 | unit | `npx vitest run tests/prfaq/hash.test.ts -t "stores hash"` | ❌ W0 | ⬜ pending |
| 06-02-08 | 02 | 1 | PRFAQ-03 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "no changes"` | ❌ W0 | ⬜ pending |
| 06-02-09 | 02 | 1 | PRFAQ-03 | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "reports changes"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/prfaq/validate.test.ts` — stubs for PRFAQ-02 (section detection)
- [ ] `tests/prfaq/hash.test.ts` — stubs for PRFAQ-03 (content hashing)
- [ ] `tests/cli/ingest-prfaq.test.ts` — stubs for PRFAQ-01, PRFAQ-02, PRFAQ-03 (integration)
- [ ] `tests/prfaq/` directory creation

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
