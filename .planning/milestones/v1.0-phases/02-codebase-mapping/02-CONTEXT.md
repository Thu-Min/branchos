# Phase 2: Codebase Mapping - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Teams have a shared, persistent understanding of their codebase that stays current as the repo evolves. This phase delivers the `map-codebase` slash command for AI-assisted map generation, shared map storage in `.branchos/shared/codebase/`, staleness detection, and a `map-status` CLI command. Workflow phases, context assembly, and team coordination are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Map content & structure
- Multiple focused files in `.branchos/shared/codebase/`: ARCHITECTURE.md, MODULES.md, CONVENTIONS.md, STACK.md, CONCERNS.md
- ARCHITECTURE.md: high-level structure, entry points, data flow
- MODULES.md: directory-level summaries (not file-level inventory), key exports and relationships; individual files only called out for important entry points or complex logic
- CONVENTIONS.md: code patterns only (naming, file organization, state management, error handling) — not workflow conventions
- STACK.md: list dependencies with purpose/role, not pinned versions (package.json already tracks versions)
- CONCERNS.md: descriptive observations of tech debt, complexity hotspots, potential risks — no prescriptive fix suggestions
- Each map file includes a metadata header with commit hash and timestamp for staleness tracking
- Configurable scope: auto-exclude node_modules, dist, build, .branchos, .git; allow custom excludes in .branchos/config.json

### Generation approach
- AI-assisted generation via Claude Code slash command — not standalone CLI
- Map generation runs INSIDE Claude Code's context as a slash command installed in `.claude/commands/`
- No separate API key needed — leverages Claude Code's existing AI context
- All 5 map files generated in one pass per invocation
- First run populates default exclude patterns in .branchos/config.json so users can see and customize

### Staleness detection
- Commit count comparison only (map's commit hash vs HEAD) — not file-aware
- Configurable threshold, default 20 commits behind HEAD, via .branchos/config.json
- Inline warning before output on relevant commands only (commands that USE the map, not every command)
- Warning format: yellow warning line suggesting `/map-codebase` refresh — non-blocking

### Refresh behavior
- Full regeneration on refresh — re-run slash command, regenerate all 5 files from scratch
- No incremental update logic
- Auto-commit updated map files (consistent with Phase 1 auto-commit pattern)
- Commit message: `chore(branchos): refresh codebase map`

### Map status command
- `branchos map-status` — lightweight CLI command (no AI needed)
- Reads map metadata headers, compares commit hash to HEAD, shows commits behind count
- Pure git comparison, fast execution

### Claude's Discretion
- Slash command prompt template design and structure
- Exact metadata header format in map files
- How to handle repos with no meaningful code yet (near-empty map)
- Internal heuristics for directory grouping in MODULES.md
- Warning color/formatting details

</decisions>

<specifics>
## Specific Ideas

- Map generation is a slash command because BranchOS is a Claude Code companion — the AI is already there
- Consistent auto-commit pattern from Phase 1 carries forward
- `branchos map-status` exists as a quick CLI check separate from the AI-powered generation

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GitOps` class (src/git/index.ts): has `addAndCommit`, `getRepoRoot`, `hasChanges` — reuse for auto-commit of map files and commit hash comparison
- `BRANCHOS_DIR`, `SHARED_DIR` constants (src/constants.ts): directory paths for map storage
- Commander CLI setup (src/cli/index.ts): `registerXxxCommand` pattern for adding `map-status` command
- `createDefaultConfig` (src/state/config.ts): extend for map-related config (excludes, staleness threshold)
- Output formatting (src/output/index.ts): reuse for colored warning messages

### Established Patterns
- Commander subcommand registration via `registerXxxCommand(program)` functions
- Auto-commit via `GitOps.addAndCommit()` after artifact creation
- `--json` flag on all commands for machine-readable output
- Schema versioning with `schemaVersion` field on state files
- Config stored in `.branchos/config.json`

### Integration Points
- `.branchos/shared/codebase/` directory: new subdirectory under existing shared dir
- `.branchos/config.json`: extend with `map.excludes` and `map.stalenessThreshold` fields
- `.claude/commands/`: slash command file(s) for map generation
- CLI entry point: register `map-status` command alongside existing init/workstream commands

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-codebase-mapping*
*Context gathered: 2026-03-08*
