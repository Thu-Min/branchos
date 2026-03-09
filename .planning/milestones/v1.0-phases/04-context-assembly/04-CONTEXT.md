# Phase 4: Context Assembly - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude Code receives focused, phase-appropriate context packets that combine shared repo knowledge with workstream-specific state. This phase delivers the context assembly CLI command, a slash command wrapper, and phase-aware context injection. Team coordination (Phase 5) is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Delivery mechanism
- New standalone `/context` slash command in `.claude/commands/context.md`
- CLI command `branchos context` does the actual assembly deterministically from files
- Slash command wraps the CLI: instructs Claude to run `branchos context` and use the output
- Auto-detect current workflow step from state.json (currentPhase + step statuses); user can override with `branchos context discuss|plan|execute`
- Add a hint at the top of existing slash commands (discuss-phase, plan-phase, execute-phase): "Tip: Run /context first for full workstream context." Existing commands unchanged otherwise

### Packet composition
- Header: workstream ID, branch, current phase number, step status, codebase map freshness (with staleness warning if behind HEAD)
- Codebase map: include ARCHITECTURE.md and CONVENTIONS.md always; add MODULES.md only for plan and execute steps
- Branch diff: `git diff --name-status` and `git diff --stat` against plan baseline (or branch point if no baseline)
- Phase artifacts: current phase only (prior phases captured in decisions.md)
- decisions.md: always included (cumulative across all phases)
- No prior phase artifacts — decisions.md serves as the cross-phase memory

### Phase-aware filtering
- **Discuss step:** header + ARCHITECTURE.md + CONVENTIONS.md + decisions.md + branch diff
- **Plan step:** header + discuss.md + MODULES.md + CONVENTIONS.md + decisions.md + branch diff
- **Execute step:** header + plan.md + execute.md (if exists) + branch diff + decisions.md (no codebase map files — Claude reads code directly during execute)
- **Fallback (no active phase):** header + ARCHITECTURE.md + CONVENTIONS.md + decisions.md + branch diff + hint to run /discuss-phase

### Size management
- No truncation or token budgeting — include everything the step needs
- Trust Claude Code's context window; defer optimization to v2 (OPT-01/OPT-02)
- Output format: standard markdown with `## Section` headings per section
- Staleness warning inline in header when codebase map is behind HEAD (reuses existing `checkStaleness()`)
- `--json` flag supported (consistent with Phase 1 convention) — returns structured JSON with sections as fields

### Claude's Discretion
- Exact markdown formatting and section ordering within the context packet
- Slash command prompt template wording
- How to handle missing files gracefully (e.g., no codebase map yet, no decisions.md)
- Git diff baseline selection logic when no planBaseline exists
- Error messaging for edge cases (no workstream, no branchos init)

</decisions>

<specifics>
## Specific Ideas

- CLI command (`branchos context`) is deterministic — no AI needed for assembly, just file reading and concatenation
- Slash command is a thin wrapper: "run the CLI, use the output as your context"
- Consistent with the established pattern: CLI handles state/git, slash commands handle AI interaction
- `--json` output enables potential future tooling integration

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveCurrentWorkstream()` (src/phase/index.ts): finds workstream by matching current branch against meta.json — direct reuse for context command
- `readState()`, `getCurrentPhase()` (src/state/state.ts, src/phase/index.ts): reads workstream state and determines active phase
- `GitOps` class (src/git/index.ts): `getChangedFiles()`, `getHeadHash()`, `getDiffStat()` — for branch diff summary
- `checkStaleness()` (src/map/staleness.ts): reuse for codebase map freshness warning in header
- `parseMapMetadata()` (src/map/metadata.ts): read commit hash from map files
- Output formatting (src/output/index.ts): `warning()`, `success()`, `error()` with chalk and `--json` support
- Commander CLI setup (src/cli/index.ts): `registerXxxCommand(program)` pattern for adding context command
- Constants (src/constants.ts): `BRANCHOS_DIR`, `SHARED_DIR`, `CODEBASE_DIR`, `WORKSTREAMS_DIR`, `PHASES_DIR`, `DECISIONS_FILE`

### Established Patterns
- Commander subcommand registration via `registerXxxCommand(program)` functions
- `--json` flag on all commands for machine-readable output
- Async-first I/O with `fs/promises`
- Separate handler export for testability
- Slash commands in `.claude/commands/` with YAML frontmatter (description, allowed-tools)

### Integration Points
- `src/cli/context.ts` — new CLI command module
- `.claude/commands/context.md` — new slash command
- `.claude/commands/discuss-phase.md`, `plan-phase.md`, `execute-phase.md` — add hint line
- Reads from `.branchos/shared/codebase/` (map files), `.branchos/workstreams/<id>/` (state, phases, decisions)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-context-assembly*
*Context gathered: 2026-03-08*
