# Phase 10: Slash Command Migration - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

All BranchOS workflow commands are available as `/branchos:*` slash commands, with the CLI reduced to `init` and `install-commands` only. Existing slash command content migrated from string literals to external `.md` files bundled at build time. Version bumped to 2.0.0.

</domain>

<decisions>
## Implementation Decisions

### Slash command storage
- Move all slash command content from string literals in `install-commands.ts` to individual `.md` files in `commands/` at repo root
- Build step (tsup) bundles `.md` files into the compiled output as a JS object — no runtime file resolution needed
- Migrate all existing 10 slash commands to `.md` files (clean break, one pattern going forward)
- `install-commands.ts` reads from the bundled object and writes to `~/.claude/commands/`

### CLI deprecation
- Remove all workflow CLI commands immediately (no deprecation warnings, no redirect messages)
- CLI retains only: `init` and `install-commands`
- `branchos init` auto-runs `install-commands` after setting up `.branchos/` — one command to get started
- Bump version to 2.0.0 (breaking change warrants major version)
- Silent removal — Commander shows "unknown command" for removed commands

### New slash commands
- `/branchos:create-workstream` — create a new workstream (works from any branch, supports `--feature` flag)
- `/branchos:list-workstreams` — list all workstreams with status
- `/branchos:status` — dashboard showing workstream status + map staleness + drift summary + conflict warnings (consolidates map-status, check-drift, detect-conflicts)
- `/branchos:archive` — archive workstream after branch merge

### Folded commands
- `map-status` info folded into `/branchos:status` (codebase map staleness section)
- `check-drift` info folded into `/branchos:status` (plan drift section)
- `detect-conflicts` info folded into `/branchos:status` (cross-workstream conflicts section)
- These do NOT get standalone slash commands

### Command naming
- Verb-noun flat pattern: `create-workstream`, `list-workstreams`, `sync-issues`, `plan-roadmap`
- No renaming of existing slash commands (discuss-phase, plan-phase, execute-phase, etc. already follow the pattern)
- `/branchos:status` keeps its name despite expanded dashboard scope

### Claude's Discretion
- tsup plugin or build script approach for bundling .md files
- Exact dashboard layout and section ordering in /branchos:status
- How to handle `$ARGUMENTS` passthrough in new slash commands
- Auto-commit behavior in new slash commands (follow existing patterns)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `install-commands.ts`: Current COMMANDS record pattern — will be refactored to read from bundled .md files
- `registerStatusCommand()` in `src/cli/status.ts`: Existing status logic to inform slash command content
- `registerArchiveCommands()` in `src/cli/archive.ts`: Existing archive logic
- `registerWorkstreamCommands()` in `src/cli/workstream.ts`: Create/list workstream logic
- `checkDrift()` in `src/cli/check-drift.ts`: Drift checking logic for status dashboard
- `detectConflicts()` in `src/cli/detect-conflicts.ts`: Conflict detection logic for status dashboard
- `checkMapStaleness()` in `src/cli/map-status.ts`: Map staleness logic for status dashboard

### Established Patterns
- Commander: `registerXxxCommand(program)` exports from `src/cli/` modules
- Slash commands: string literals with `$ARGUMENTS` placeholder, YAML frontmatter with `allowed-tools`
- `--json` flag for machine-readable output on all commands
- Auto-commit: all state-changing commands commit artifacts to git
- Handler pattern: CLI validates input, handler does business logic, returns result

### Integration Points
- `commands/` directory at repo root (new) — source .md files for all slash commands
- `tsup.config.ts` — needs build plugin/script to bundle .md files
- `src/cli/install-commands.ts` — refactored to use bundled .md content instead of string literals
- `src/cli/index.ts` — remove workflow command registrations, keep init + install-commands
- `src/cli/init.ts` — add auto-run of install-commands after init
- `package.json` — version bump to 2.0.0

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-slash-command-migration*
*Context gathered: 2026-03-10*
