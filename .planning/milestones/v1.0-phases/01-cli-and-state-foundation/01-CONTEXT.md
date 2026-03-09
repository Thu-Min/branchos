# Phase 1: CLI and State Foundation - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers can install BranchOS via npm, initialize a repository, and create/manage workstreams with isolated, schema-versioned state. This phase delivers the CLI scaffold, git integration, state manager, workstream CRUD, and directory structure. Workflow phases (discuss/plan/execute), codebase mapping, context assembly, and team coordination are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Workstream ID design
- Strip common branch prefixes (`feature/`, `fix/`, `hotfix/`) and slugify the remainder. `feature/payment-retry` becomes `payment-retry`
- Allowed characters: lowercase alphanumeric, hyphens, and underscores
- No maximum length limit on workstream IDs
- On slug collision (two branches producing the same ID), error with a clear message suggesting `--name` override
- Workstream creation requires being on the target branch — auto-detect current branch, no `--branch` flag
- Block workstream creation on protected branches (`main`, `master`, `develop`) — error, not warning
- If the git branch is renamed after workstream creation, detect mismatch on next command and warn the user to run an update command
- Do not store `base_branch` in Phase 1 — add when conflict detection needs it in Phase 5

### Init behavior
- `branchos init` creates: `.branchos/shared/`, `.branchos/workstreams/`, `.branchos/config.json`, and adds `.branchos-runtime/` to `.gitignore`
- Requires being inside a git repository — error if not: "Not a git repository. Run `git init` first."
- Idempotent re-init: skip existing files/dirs, create any missing ones, report what was added
- Auto-commit the `.branchos/` directory on init with message "chore: initialize branchos"

### CLI command surface
- Subcommand group structure: `branchos workstream create`, `branchos workstream list`, etc.
- Default output: colored, human-readable terminal output
- `--json` flag available on all commands for machine-readable output
- `branchos` with no arguments shows help (standard CLI convention)
- `branchos workstream list` deferred to Phase 5 (`branchos status` covers it)

### State schema design
- Integer-based schema versioning (`schemaVersion: 1`) with automatic migration on read
- Loose validation: parse known fields, silently ignore unknown fields (forward-compatible)
- Workstream discovery via directory scan of `workstreams/` — no `index.json` registry file
- `meta.json` v1 fields (minimal): `schemaVersion`, `workstreamId`, `branch`, `status`, `createdAt`, `updatedAt`
- `state.json` created as empty scaffold on workstream creation: `schemaVersion`, `status: "created"`, empty tasks array. Phase 3 populates it.

### Claude's Discretion
- CLI framework choice (commander, yargs, oclif, etc.)
- TypeScript project setup and build configuration
- Git integration library (simple-git vs raw child_process)
- Exact slugification implementation details
- Config.json schema and default values
- Error message wording and formatting
- Color scheme for terminal output

</decisions>

<specifics>
## Specific Ideas

- Project doc suggests `.branchos-runtime/` for temp/cache data, separate from committed `.branchos/`
- Workstream-first, not developer-first: state scoped to workstream, not person
- Tool should feel familiar to GSD users but use its own namespace (`branchos` not `/gsd`)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Node.js / TypeScript stack (decided in PROJECT.md)
- npm distribution (`npm install -g branchos`)

### Integration Points
- Git repository: `.branchos/` directory at repo root
- `.gitignore`: add `.branchos-runtime/`
- npm: `package.json` with `bin` entry for global install

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-cli-and-state-foundation*
*Context gathered: 2026-03-07*
