---
phase: 2
slug: codebase-mapping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

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
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | MAP-01 | unit | `npx vitest run tests/map/slash-command.test.ts -t "slash command"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | MAP-01 | unit | `npx vitest run tests/state/config.test.ts -t "map config"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | MAP-02 | unit | `npx vitest run tests/map/metadata.test.ts -t "parseMapMetadata"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | MAP-03 | unit | `npx vitest run tests/map/staleness.test.ts -t "staleness"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 0 | MAP-03 | unit | `npx vitest run tests/map/staleness.test.ts -t "unknown hash"` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 0 | MAP-03 | unit | `npx vitest run tests/cli/map-status.test.ts -t "map-status"` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 0 | MAP-03 | unit | `npx vitest run tests/output/index.test.ts -t "warning"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/map/metadata.test.ts` — stubs for MAP-02 metadata parsing
- [ ] `tests/map/staleness.test.ts` — stubs for MAP-03 staleness detection
- [ ] `tests/cli/map-status.test.ts` — stubs for MAP-03 CLI command
- [ ] `tests/map/slash-command.test.ts` — stubs for MAP-01 slash command file validation
- [ ] `tests/state/config.test.ts` (extend existing) — stubs for MAP-01 config defaults
- [ ] `tests/output/index.test.ts` (extend existing) — stubs for MAP-03 warning output

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auto-commit after map generation | MAP-01 | Requires Claude Code slash command context | 1. Run `/map-codebase` in Claude Code 2. Verify git log shows `chore(branchos): refresh codebase map` commit 3. Verify 5 files in `.branchos/shared/codebase/` |
| Full slash command generates all 5 map files | MAP-01 | Requires AI reasoning via Claude Code | 1. Run `/map-codebase` 2. Verify ARCHITECTURE.md, MODULES.md, CONVENTIONS.md, STACK.md, CONCERNS.md all exist with valid metadata headers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
