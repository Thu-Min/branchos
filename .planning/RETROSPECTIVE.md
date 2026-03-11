# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — BranchOS Initial Release

**Shipped:** 2026-03-09
**Phases:** 5 | **Plans:** 13 | **Tasks:** 26

### What Was Built
- CLI tool (`branchos`) with 10 commands: init, workstream create, map-codebase, map-status, discuss-phase, plan-phase, execute-phase, context, status, detect-conflicts, archive, unarchive, check-drift
- Two-layer state model isolating shared repo context from workstream-scoped state
- Phase-aware context assembly delivering focused context to Claude Code via slash commands
- File-level cross-workstream conflict detection with severity classification
- Branch-switch workstream prompt integrated across all workstream-scoped commands
- 219 passing tests across all modules

### What Worked
- 3-day execution from project init to all 29 requirements satisfied — extremely fast
- TDD workflow (red-green commits) caught bugs early and kept quality high
- Pure function pattern for core logic (assembleContext, detectConflicts) made testing trivial
- Phase dependency analysis allowed Phases 2 and 3 to run in parallel
- Schema migration (v0→v1→v2 chaining) handled state evolution cleanly

### What Was Inefficient
- SUMMARY.md frontmatter lacked `one_liner` field, requiring manual extraction during milestone completion
- Nyquist validation left in PARTIAL status across all 5 phases — never completed
- Performance metrics in STATE.md had a formatting issue (table outside proper section)
- Some orphaned exports (phase lifecycle, decision log) shipped without programmatic consumers

### Patterns Established
- Handler exported separately from command registration for direct testability
- GitOps module as single point for all git operations (commit, diff, merge-base)
- resolveCurrentWorkstream via meta.json branch matching (not slug convention)
- ensureWorkstream gate pattern for workstream-scoped commands
- Output module with dual-mode (JSON + human-readable) for all commands

### Key Lessons
1. Pure functions for core logic + thin I/O wrappers = fast tests and reliable behavior
2. Schema migration should be chained through intermediate versions, not skip versions
3. Branch-switch integration needs to be planned from the start, not bolted on last phase
4. File-level conflict detection is sufficient for small teams — module-level is premature

### Cost Observations
- Model mix: 100% opus (quality profile throughout)
- Sessions: ~13 (one per plan execution)
- Notable: Average 3 minutes per plan — high velocity with minimal rework

---

## Milestone: v2.1 — Interactive Research

**Shipped:** 2026-03-11
**Phases:** 4 | **Plans:** 6

### What Was Built
- Research storage foundation with structured markdown, YAML frontmatter, auto-rebuilding index, and feature linkage (40 tests)
- Interactive research command (`/branchos:research`) with bookend pattern, AskUserQuestion, adaptive questioning, and `--save` persistence
- Context assembly integration — research summaries automatically flow into discuss/plan context packets
- Discuss-project command (`/branchos:discuss-project`) for guided PR-FAQ creation with ingest-prfaq delegation
- Generalized frontmatter parser shared by features and research modules
- 522 tests total across 47 test files

### What Worked
- Single-day execution for all 4 phases (14 requirements) — fastest milestone yet
- Generalized frontmatter parser avoided duplicating parse/stringify logic across features and research
- Bookend pattern proved reusable — applied consistently across research and discuss-project commands
- Context assembly's null-skip pattern from v2.0 made adding researchSummaries nearly zero-friction
- TDD red-green workflow continued to catch issues early (every plan started with failing tests)

### What Was Inefficient
- SUMMARY.md frontmatter still lacks `one_liner` field (same issue as v1.0) — caused null extraction during milestone completion
- Nyquist validation again left in PARTIAL status across all 4 phases — pattern of skipping validation persists
- `findResearchByFeature` was exported and tested but never used — context.ts implemented equivalent inline logic instead
- No v2.0 retrospective was written — gap in the living document

### Patterns Established
- Bookend pattern for interactive slash commands (frame → Claude drives → explicit save)
- AskUserQuestion with numbered options + freeform Other at every decision point
- Natural language guidelines over pseudocode for Claude-driven interactive flows
- Research in shared state (not workstream-scoped) for domain knowledge accessibility
- Summary separation designed into storage for context window management

### Key Lessons
1. Bookend pattern is the right abstraction for interactive slash commands — reusable and consistent UX
2. Generalized utilities (frontmatter parser) pay dividends immediately when a second consumer appears
3. Auto-rebuild-on-write (index after file write) prevents an entire class of stale-state bugs
4. Nyquist validation needs to be integrated into execution workflow, not left as optional post-step
5. SUMMARY frontmatter schema should include `one_liner` — same gap hit twice now

### Cost Observations
- Model mix: 100% opus (quality profile throughout)
- Sessions: ~6 (one per plan execution)
- Notable: 3min average per plan — consistent with v1.0 velocity

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~13 | 5 | Initial release — established all patterns |
| v2.1 | ~6 | 4 | Interactive commands — bookend pattern, AskUserQuestion |

### Cumulative Quality

| Milestone | Tests | Coverage | Tech Debt Items |
|-----------|-------|----------|-----------------|
| v1.0 | 219 | — | 6 |
| v2.1 | 522 | — | 1 (orphaned export) |

### Top Lessons (Verified Across Milestones)

1. TDD red-green workflow catches bugs early and keeps quality high (v1.0, v2.1)
2. Pure functions + thin I/O wrappers = fast tests and reliable behavior (v1.0, v2.1)
3. Generalized utilities pay off immediately when second consumer appears (v2.1)
4. SUMMARY frontmatter needs `one_liner` field — same gap in v1.0 and v2.1
5. Nyquist validation skipped in both milestones — needs workflow integration, not manual discipline
