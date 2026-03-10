# Milestones

## v2.0 Project-Level Planning (In Progress)

**Phases:** 5 (Phases 6-10) | **Plans:** ~12 (TBD) | **Requirements:** 17
**Status:** Roadmap created, ready to plan Phase 6

**Goal:** Add a project-level planning layer above workstreams -- from PR-FAQ ingestion through feature registry and GitHub Issues, all driven via slash commands.

**Phases:**
1. Phase 6: PR-FAQ Ingestion (PRFAQ-01, PRFAQ-02, PRFAQ-03)
2. Phase 7: Roadmap Generation and Feature Registry (ROAD-01, ROAD-02, ROAD-03, FEAT-01, FEAT-02, FEAT-03)
3. Phase 8: Feature-Aware Workstreams (WORK-01, WORK-02)
4. Phase 9: GitHub Issues Sync and Roadmap Refresh (GHIS-01, GHIS-02, ROAD-04, ROAD-05)
5. Phase 10: Slash Command Migration (MIGR-01, MIGR-02)

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
