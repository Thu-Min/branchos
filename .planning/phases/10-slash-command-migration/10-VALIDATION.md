---
phase: 10
slug: slash-command-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^3.0.0 |
| **Config file** | none — uses package.json scripts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | MIGR-01 | unit | `npx vitest run tests/commands/index.test.ts -t "exports all commands"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | MIGR-01 | unit | `npx vitest run tests/commands/index.test.ts -t "14 commands"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 0 | MIGR-01 | unit | `npx vitest run tests/commands/index.test.ts -t "frontmatter"` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 0 | MIGR-01 | unit | `npx vitest run tests/cli/install-commands.test.ts -t "installs"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 0 | MIGR-02 | unit | `npx vitest run tests/cli/index.test.ts -t "only bootstrapper"` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 0 | MIGR-02 | unit | `npx vitest run tests/cli/index.test.ts -t "version"` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 0 | MIGR-02 | unit | `npx vitest run tests/cli/init.test.ts -t "auto-install"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/commands/index.test.ts` — stubs for MIGR-01 (command count, frontmatter validation)
- [ ] `tests/cli/install-commands.test.ts` — stubs for MIGR-01 (writes files correctly)
- [ ] `tests/cli/index.test.ts` — stubs for MIGR-02 (only bootstrapper commands registered)
- [ ] TypeScript declaration file for `.md` imports (`src/types/md.d.ts`)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slash commands work in Claude Code | MIGR-01 | Requires Claude Code runtime | 1. Run `branchos install-commands` 2. Open Claude Code 3. Type `/branchos:` and verify autocomplete shows all commands |
| Commands work in both `commands/` and `skills/` dirs | MIGR-01 | Requires Claude Code runtime | 1. Copy commands to `~/.claude/skills/` 2. Verify they appear in Claude Code |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
