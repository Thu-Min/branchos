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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~13 | 5 | Initial release — established all patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Tech Debt Items |
|-----------|-------|----------|-----------------|
| v1.0 | 219 | — | 6 |

### Top Lessons (Verified Across Milestones)

1. (First milestone — lessons will be verified in future milestones)
