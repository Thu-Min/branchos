# Phase 8: Feature-Aware Workstreams - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Developers can create workstreams linked to specific features with `--feature <id>`. The workstream auto-creates the feature branch, includes acceptance criteria in context packets, and updates feature status. Issue linking is Phase 9. Roadmap refresh is Phase 9. Slash command migration is Phase 10.

</domain>

<decisions>
## Implementation Decisions

### Branch handling
- `--feature <id>` auto-creates and checks out the feature branch (e.g., `feature/user-auth` from `featureBranch()`)
- Works from protected branches (main/master/develop) — creates feature branch from current HEAD
- If feature branch already exists: interactive prompt "Branch feature/<slug> already exists. Use it?"
- Workstream ID derived from branch name (existing `slugifyBranch()` behavior), not from feature ID
- No `--issue` flag — issue linking deferred to Phase 9

### Context packet integration
- New dedicated "Feature Context" section in context packets for feature-linked workstreams
- Includes full feature body (title, acceptance criteria, description — entire markdown content)
- Section appears in all workflow steps (discuss, plan, execute)
- Non-feature workstreams unchanged — no feature section, no hint about features

### Status transitions
- On workstream creation: feature status jumps directly to `in-progress` (skip `assigned`)
- On workstream archive: prompt user "Mark feature F-001 as complete?" — user decides
- One feature = one workstream (enforced). Large features should be split into multiple feature files
- Bidirectional link: workstream `meta.json` stores `featureId`, feature frontmatter gains `workstream` field

### Error handling
- Non-existent feature: "Feature F-099 not found. Available features: F-001, F-002, F-003. Run /branchos:features to see all."
- Feature already in-progress: "Feature F-001 is already in-progress (workstream: user-auth). One feature = one workstream." — blocks creation
- No features directory: "No features found. Run /branchos:plan-roadmap first to generate features from your PR-FAQ."

### Claude's Discretion
- Exact prompt wording for branch-exists confirmation and archive-completion prompt
- Feature context section positioning within the context packet
- How to handle `--force` flag interaction with branch-exists prompt
- Commit message format for feature status updates

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createWorkstream()` in `src/workstream/create.ts`: Core creation logic — needs `featureId` parameter added
- `WorkstreamMeta` in `src/state/meta.ts`: Extend with optional `featureId` field
- `FeatureFrontmatter` in `src/roadmap/types.ts`: Extend with optional `workstream` field
- `readFeatureFile()`, `readAllFeatures()` in `src/roadmap/feature-file.ts`: Read feature by ID
- `writeFeatureFile()` in `src/roadmap/feature-file.ts`: Update feature status and workstream field
- `featureBranch()` in `src/roadmap/slug.ts`: Generate `feature/<slug>` branch name from title
- `assembleContext()` in `src/context/assemble.ts`: Pure function — add feature section to `STEP_SECTIONS`
- `AssemblyInput` in `src/context/assemble.ts`: Add `featureContext` field
- `slugifyBranch()` in `src/workstream/resolve.ts`: Derive workstream ID from branch name
- `GitOps` in `src/git/index.ts`: Branch creation and checkout operations

### Established Patterns
- Commander: `registerXxxCommand(program)` exports from `src/cli/` modules
- Auto-commit: all state-changing commands commit artifacts to git
- `--json` flag for machine-readable output
- Handler pattern: CLI validates input, handler does business logic, returns result
- Hand-rolled YAML frontmatter (no external dependencies)

### Integration Points
- Extend `registerWorkstreamCommand()` in `src/cli/workstream.ts` with `--feature` option
- Extend `createWorkstream()` in `src/workstream/create.ts` with feature linking
- Extend `AssemblyInput` and `STEP_SECTIONS` in `src/context/assemble.ts`
- Extend `WorkstreamMeta` in `src/state/meta.ts` with `featureId`
- Extend `FeatureFrontmatter` in `src/roadmap/types.ts` with `workstream`
- Update archive flow in `src/workstream/archive.ts` to prompt for feature completion
- New entry or update in `COMMANDS` record in `install-commands.ts`

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

*Phase: 08-feature-aware-workstreams*
*Context gathered: 2026-03-10*
