---
phase: 7
slug: roadmap-generation-and-feature-registry
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (latest, from devDependencies) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/roadmap/ tests/cli/plan-roadmap.test.ts tests/cli/features.test.ts -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/roadmap/ tests/cli/plan-roadmap.test.ts tests/cli/features.test.ts -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | FEAT-01 | unit | `npx vitest run tests/roadmap/frontmatter.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | ROAD-03 | unit | `npx vitest run tests/roadmap/feature-file.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | ROAD-02 | unit | `npx vitest run tests/roadmap/roadmap-file.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | ROAD-03 | unit | `npx vitest run tests/roadmap/slug.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | ROAD-01 | unit | `npx vitest run tests/cli/plan-roadmap.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | FEAT-02 | unit | `npx vitest run tests/roadmap/types.test.ts -x` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | FEAT-03 | unit | `npx vitest run tests/cli/features.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/roadmap/frontmatter.test.ts` — stubs for FEAT-01
- [ ] `tests/roadmap/feature-file.test.ts` — stubs for ROAD-03
- [ ] `tests/roadmap/roadmap-file.test.ts` — stubs for ROAD-02
- [ ] `tests/roadmap/slug.test.ts` — stubs for slug generation
- [ ] `tests/cli/plan-roadmap.test.ts` — stubs for ROAD-01
- [ ] `tests/cli/features.test.ts` — stubs for FEAT-03
- [ ] `tests/roadmap/types.test.ts` — stubs for FEAT-02

*Existing infrastructure covers framework installation — vitest already in devDependencies.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI-inferred milestones from PR-FAQ | ROAD-02 | Claude inference quality is subjective | Review generated ROADMAP.md for logical milestone grouping |
| Slash command user experience | ROAD-01 | Interactive Claude session | Run `/branchos:plan-roadmap` and verify confirmation prompt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
