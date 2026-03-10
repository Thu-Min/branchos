# Phase 7: Roadmap Generation and Feature Registry - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate a structured ROADMAP.md with milestones, ordered features, and dependencies from an ingested PR-FAQ. Create individual feature files with YAML frontmatter and acceptance criteria. Provide a feature listing command with filtering and detail view. Roadmap refresh from PR-FAQ changes is Phase 9. Feature-workstream linkage is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Roadmap structure
- Claude infers milestones from PR-FAQ content (groups related features by dependencies and logical phases)
- Features listed in suggested execution order within each milestone
- Dependencies noted inline with depends-on notation (e.g., "depends on: F-003")
- Roadmap lives at `.branchos/shared/ROADMAP.md`
- Includes summary header with project name, vision one-liner, total feature/milestone counts
- Inline progress tracking per milestone (e.g., "3/8 features complete"), updated as features progress

### Feature file format
- Files stored in `.branchos/shared/features/` directory
- Sequential IDs: F-001, F-002, F-003
- Filename format: `F-001-user-auth.md` (ID + slug)
- YAML frontmatter: id, title, status, milestone, branch, issue
- Branch names derived as `feature/<slug>` (uses existing STRIP_PREFIXES constant)
- Acceptance criteria as markdown checklists (`- [ ] User can...`)
- Status lifecycle: unassigned -> assigned -> in-progress -> complete

### AI generation approach
- `/branchos:plan-roadmap` requires an ingested PR-FAQ (error if none: "Run /branchos:ingest-prfaq first")
- Generates draft, shows summary, asks user to confirm before committing
- Feature granularity: fine-grained, workstream-sized (each feature maps to roughly one workstream)
- If ROADMAP.md already exists: warn and require `--force` flag to regenerate
- Auto-commit after user confirms (consistent with Phase 6 pattern)

### Feature listing
- `/branchos:features` shows table with columns: ID, Title, Status, Milestone
- Supports `--status <value>` and `--milestone <value>` filtering flags
- Supports `--json` flag for machine-readable output (existing pattern)
- `/branchos:features <id>` shows full detail view: all frontmatter fields + acceptance criteria body
- Status transitions are automatic from workstream events (Phase 8 handles linkage), no manual status command in this phase

### Claude's Discretion
- Exact milestone inference algorithm from PR-FAQ
- YAML frontmatter field ordering and optional fields
- Table formatting and column widths
- Summary confirmation prompt wording
- Feature slug generation from titles

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SHARED_DIR`, `BRANCHOS_DIR` constants in `src/constants.ts` — path construction
- `GitOps.addAndCommit()` in `src/git/index.ts` — auto-commit pattern
- `success()`, `error()`, `output()` in `src/output/index.ts` — CLI output formatting
- `registerXxxCommand(program)` pattern in `src/cli/*.ts` — command registration
- `COMMANDS` record in `src/cli/install-commands.ts` — slash command registration
- `detectSections()`, `readMeta()` from `src/prfaq/` — reading ingested PR-FAQ and metadata
- `PrfaqMeta` type with `contentHash`, `sectionsFound` — checking PR-FAQ existence

### Established Patterns
- Commander: `registerXxxCommand(program)` exports from `src/cli/` modules
- Output: `--json` flag for conditional JSON vs human-readable output
- State: JSON files with typed interfaces, `readFile`/`writeFile` from `fs/promises`
- Auto-commit: all state-changing commands commit artifacts to git
- Slash commands: stored as string literals in `install-commands.ts` COMMANDS record

### Integration Points
- New `src/cli/plan-roadmap.ts` module for roadmap generation command
- New `src/cli/features.ts` module for feature listing command
- New `src/roadmap/` module for roadmap/feature types and utilities
- Reads from `.branchos/shared/PR-FAQ.md` and `prfaq-meta.json` (Phase 6 output)
- Writes to `.branchos/shared/ROADMAP.md` and `.branchos/shared/features/*.md`
- New entries in `COMMANDS` record for slash commands
- Register commands in `src/cli/index.ts`

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

*Phase: 07-roadmap-generation-and-feature-registry*
*Context gathered: 2026-03-10*
