---
phase: 1
slug: cli-and-state-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | `vitest.config.ts` -- Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | CLI-01 | integration | `node dist/index.cjs --help` | No -- Wave 0 | ⬜ pending |
| 01-01-02 | 01 | 0 | CLI-02 | integration | `npx vitest run tests/cli/init.test.ts -t "init"` | No -- Wave 0 | ⬜ pending |
| 01-01-03 | 01 | 0 | CLI-03 | unit | `npx vitest run tests/cli/help.test.ts` | No -- Wave 0 | ⬜ pending |
| 01-01-04 | 01 | 0 | CLI-04 | smoke | `node -e "assert(process.version >= 'v20')"` | N/A -- CI | ⬜ pending |
| 01-01-05 | 01 | 0 | STA-01 | unit | `npx vitest run tests/state/` | No -- Wave 0 | ⬜ pending |
| 01-01-06 | 01 | 0 | STA-02 | unit | `npx vitest run tests/state/state.test.ts` | No -- Wave 0 | ⬜ pending |
| 01-01-07 | 01 | 0 | STA-03 | integration | `npx vitest run tests/cli/init.test.ts -t "commit"` | No -- Wave 0 | ⬜ pending |
| 01-01-08 | 01 | 0 | STA-04 | unit | `npx vitest run tests/state/schema.test.ts` | No -- Wave 0 | ⬜ pending |
| 01-01-09 | 01 | 0 | WRK-01 | unit | `npx vitest run tests/workstream/resolve.test.ts` | No -- Wave 0 | ⬜ pending |
| 01-01-10 | 01 | 0 | WRK-02 | integration | `npx vitest run tests/cli/workstream.test.ts -t "name"` | No -- Wave 0 | ⬜ pending |
| 01-01-11 | 01 | 0 | WRK-06 | unit | `npx vitest run tests/workstream/resolve.test.ts` | No -- Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` -- vitest configuration
- [ ] `tests/workstream/resolve.test.ts` -- slug derivation, protected branch checks (WRK-01, WRK-06)
- [ ] `tests/state/schema.test.ts` -- schema version, migration logic (STA-04)
- [ ] `tests/state/meta.test.ts` -- meta.json creation (STA-02)
- [ ] `tests/state/state.test.ts` -- state.json scaffold (STA-02)
- [ ] `tests/cli/init.test.ts` -- init command, directory creation, git commit (CLI-02, STA-01, STA-03)
- [ ] `tests/cli/workstream.test.ts` -- workstream create command (WRK-01, WRK-02)
- [ ] `tests/git/index.test.ts` -- git operations wrapper
- [ ] Framework install: `npm install -D vitest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Global install via npm | CLI-01 | Requires actual `npm install -g` | Run `npm install -g .` from repo root, verify `branchos --help` works |
| Works on macOS/Linux | CLI-04 | Platform-specific | Run test suite on both macOS and Linux |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
