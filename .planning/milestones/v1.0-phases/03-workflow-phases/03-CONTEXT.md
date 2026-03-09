# Phase 3: Workflow Phases - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Each workstream supports a structured multi-phase workflow where developers discuss, plan, and execute with tracked progress and captured decisions. This phase delivers the three workflow commands (discuss-phase, plan-phase, execute-phase) as slash commands, multi-phase state tracking, drift detection, and a workstream-scoped decision log. Context assembly (Phase 4) and team coordination (Phase 5) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Phase lifecycle model
- Flexible with warnings: any step can run anytime, but warn if prerequisites are missing (e.g., "No discuss.md found — planning without context")
- Re-running a step overwrites the previous artifact with confirmation warning; git history preserves the old version
- Auto-increment phase numbering: phases numbered 1, 2, 3... automatically. `branchos discuss-phase` creates the next phase. `branchos discuss-phase 2` targets a specific phase
- state.json gets a `phases` array: `[{number, status, discuss: {}, plan: {}, execute: {}}]` with a `currentPhase` field. Schema version bumps to 2 with migration from v1

### Artifact format & storage
- Pure markdown files with structured sections (no frontmatter, no JSON)
- Per-phase subdirectories: `.branchos/workstreams/<id>/phases/1/discuss.md`, `.../phases/1/plan.md`, `.../phases/1/execute.md`
- discuss.md sections: goal, requirements, assumptions, unknowns, decisions
- plan.md sections: tasks with dependencies, affected files, risks
- execute.md sections: task status, blockers, completed work
- AI-powered generation via slash commands installed in `.claude/commands/` (consistent with Phase 2's map-codebase pattern). CLI handles state tracking and git commits

### Drift detection
- File-level comparison: plan.md lists affected files per task, compared against `git diff --name-only` from plan creation to HEAD
- Baseline: store git commit hash when plan.md is created (GitOps.getHeadHash() already available)
- On-demand command: `branchos check-drift` — developer explicitly checks when they want to reconcile
- Categorized file list report: "Planned & changed" (on track), "Planned but not changed" (incomplete), "Changed but not planned" (unplanned work). Color-coded, with `--json` for machine output

### Decision log
- Workstream-level `decisions.md` in workstream root — single file accumulating decisions across all phases
- Structured entries: title, phase number, context (why it came up), choice made, alternatives considered
- Slash commands extract decisions: during discuss-phase and plan-phase, the prompt instructs Claude to identify and append decisions to decisions.md. CLI auto-commits
- decisions.md always included in context assembly (Phase 4) — prevents re-litigating choices

### Claude's Discretion
- Exact slash command prompt template design for discuss/plan/execute
- Markdown section headers and formatting within artifacts
- How state.json migration handles existing workstreams with no phases array
- check-drift output formatting details
- How to handle edge cases (empty workstream, no git commits since plan)

</decisions>

<specifics>
## Specific Ideas

- Slash command pattern established in Phase 2 (map-codebase) carries forward — BranchOS is a Claude Code companion, the AI is already there
- Auto-commit pattern from Phase 1 continues for all artifact creation
- `--json` flag on all new commands (consistent with Phase 1 convention)
- Handler functions exported separately from CLI registration for testability (established pattern)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GitOps` class (src/git/index.ts): `addAndCommit()`, `getHeadHash()`, `getCommitsBehind()`, `hasChanges()` — reuse for artifact commits, drift baseline, and drift comparison
- Commander CLI setup (src/cli/index.ts): `registerXxxCommand(program)` pattern for adding check-drift command
- Output formatting (src/output/index.ts): `warning()`, `success()`, `error()` with chalk coloring and `--json` support
- Schema migration (src/state/schema.ts): `migrateIfNeeded<T>()` for state.json v1→v2 migration
- State read/write (src/state/state.ts): `readState()`, `writeState()` — extend for phases array
- Workstream discovery (src/workstream/discover.ts): `discoverWorkstreams()` for listing workstreams
- Map metadata pattern (src/map/metadata.ts): `parseMapMetadata()` pattern for embedding commit hashes in artifacts

### Established Patterns
- Commander subcommand registration via `registerXxxCommand(program)` functions
- Auto-commit via `GitOps.addAndCommit()` after artifact creation
- `--json` flag on all commands for machine-readable output
- Schema versioning with `schemaVersion` field and `migrateIfNeeded()` on read
- Async-first I/O with `fs/promises`
- Factory functions for creating default state objects
- Separate handler export for testability

### Integration Points
- `.branchos/workstreams/<id>/phases/` — new subdirectory under existing workstream dirs
- `.branchos/workstreams/<id>/decisions.md` — new file in workstream root
- `.claude/commands/` — 3 new slash command files for discuss/plan/execute
- `src/cli/index.ts` — register check-drift command
- `src/state/schema.ts` — add v2 migration for phases array in state.json
- `src/state/state.ts` — extend WorkstreamState interface with phases and currentPhase

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-workflow-phases*
*Context gathered: 2026-03-08*
