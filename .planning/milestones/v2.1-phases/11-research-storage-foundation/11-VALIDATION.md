---
phase: 11
slug: research-storage-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/research/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/research/ tests/roadmap/frontmatter.test.ts tests/roadmap/feature-file.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | RES-03 | unit | `npx vitest run tests/research/research-file.test.ts -t "write"` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | RES-03 | unit | `npx vitest run tests/research/research-file.test.ts -t "read"` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | RES-03 | unit | `npx vitest run tests/research/research-file.test.ts -t "readAll"` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | RES-04 | unit | `npx vitest run tests/research/research-frontmatter.test.ts -t "features"` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 1 | RES-04 | unit | `npx vitest run tests/research/research-index.test.ts -t "findByFeature"` | ❌ W0 | ⬜ pending |
| 11-01-06 | 01 | 1 | RES-04 | unit | `npx vitest run tests/research/research-index.test.ts -t "rebuild"` | ❌ W0 | ⬜ pending |
| 11-01-07 | 01 | 1 | RES-05 | unit | `npx vitest run tests/research/extract-summary.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-08 | 01 | 1 | RES-05 | unit | `npx vitest run tests/research/extract-summary.test.ts -t "missing"` | ❌ W0 | ⬜ pending |
| 11-REG-01 | 01 | 1 | N/A | regression | `npx vitest run tests/roadmap/frontmatter.test.ts` | ✅ | ⬜ pending |
| 11-REG-02 | 01 | 1 | N/A | regression | `npx vitest run tests/roadmap/feature-file.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/research/research-file.test.ts` — stubs for RES-03 (write, read, readAll)
- [ ] `tests/research/research-frontmatter.test.ts` — covers array parsing, round-trips
- [ ] `tests/research/research-index.test.ts` — covers RES-04 (rebuild, findByFeature, readIndex)
- [ ] `tests/research/extract-summary.test.ts` — covers RES-05 (extraction, edge cases)

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
