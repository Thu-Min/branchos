# Milestones

## v2.1 Interactive Research (Shipped: 2026-03-11)

**Phases:** 4 (Phases 11-14) | **Plans:** 6 | **Requirements:** 14/14
**Files changed:** 50 | **Lines:** +5,270 / -106 | **Codebase:** 12,149 LOC TypeScript
**Timeline:** 1 day (2026-03-11)
**Git range:** docs(11) → docs(phase-14)

**Key accomplishments:**
1. Research storage foundation with structured markdown artifacts, YAML frontmatter, auto-rebuilding index, and feature linkage
2. Interactive research command (`/branchos:research`) with bookend pattern, AskUserQuestion decision points, adaptive questioning, and `--save` persistence
3. Context assembly integration — research summaries automatically flow into discuss/plan context packets with backward compatibility
4. Discuss-project command (`/branchos:discuss-project`) creates PR-FAQ through guided interactive conversation with ingest-prfaq delegation
5. Generalized frontmatter parser shared by features and research modules
6. Full TDD coverage — 522 tests passing across 47 test files

**Archive:** `.planning/milestones/v2.1-ROADMAP.md`, `v2.1-REQUIREMENTS.md`

---

## v2.0 Project-Level Planning (Shipped: 2026-03-10)

**Phases:** 5 (Phases 6-10) | **Plans:** 12 | **Requirements:** 17/17
**Files changed:** 109 | **Lines:** +12,287 / -923 | **Codebase:** 10,870 LOC TypeScript
**Timeline:** 3 days (2026-03-07 → 2026-03-10)
**Git range:** feat(06-01) → feat(10-02)

**Key accomplishments:**
1. PR-FAQ ingestion with structure validation and content-hash change detection
2. Roadmap generation with milestones, features, dependencies, and branch names
3. Feature registry with YAML frontmatter, status lifecycle, and CLI listing
4. Feature-aware workstream creation with acceptance criteria in context packets
5. GitHub Issues sync (idempotent create/update) and roadmap refresh from PR-FAQ changes
6. Full slash command migration — CLI reduced to bootstrapper, 14 slash commands

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `v2.0-REQUIREMENTS.md`

---

## v1.0 BranchOS Initial Release (Shipped: 2026-03-09)

**Phases:** 5 | **Plans:** 13 | **Tasks:** 26
**Commits:** 91 | **Files:** 127 | **LOC:** 5,822 TypeScript
**Timeline:** 3 days (2026-03-07 -> 2026-03-09)
**Git range:** c8d33ce -> d5a99d7
**Requirements:** 29/29 satisfied

**Key accomplishments:**
1. CLI scaffold with TypeScript/tsup build, Commander entry point, and npm-distributable package
2. Two-layer state model with shared repo context and workstream-scoped isolation
3. Codebase mapping with slash command generation and staleness detection
4. Three-step workflow lifecycle (discuss/plan/execute) with phase-aware slash commands
5. Context assembly combining repo baseline, workstream state, and branch diffs for Claude Code
6. Team coordination: cross-workstream status, file-level conflict detection, archive lifecycle, and branch-switch prompts

### Known Tech Debt
- TypeScript error: `simpleGit()` TS2349 in src/git/index.ts (runtime works, tsc fails)
- Engine constraint: package.json says >=20 but CLI-04 says Node.js 18+
- Orphaned exports in phase lifecycle and decision log modules
- Unused `warning` imports in conflicts.ts and archive.ts

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `v1.0-REQUIREMENTS.md`

---
