# Roadmap: BranchOS

## Milestones

- ✅ **v1.0 BranchOS Initial Release** -- Phases 1-5 (shipped 2026-03-09)
- 🚧 **v2.0 Project-Level Planning** -- Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 BranchOS Initial Release (Phases 1-5) -- SHIPPED 2026-03-09</summary>

- [x] Phase 1: CLI and State Foundation (3/3 plans) -- completed 2026-03-07
- [x] Phase 2: Codebase Mapping (2/2 plans) -- completed 2026-03-08
- [x] Phase 3: Workflow Phases (3/3 plans) -- completed 2026-03-08
- [x] Phase 4: Context Assembly (2/2 plans) -- completed 2026-03-08
- [x] Phase 5: Team Coordination (3/3 plans) -- completed 2026-03-09

</details>

### v2.0 Project-Level Planning

**Milestone Goal:** Add a project-level planning layer above workstreams -- from PR-FAQ ingestion through feature registry and GitHub Issues, all driven via slash commands.

**Phase Numbering:**
- Integer phases (6, 7, 8...): Planned milestone work
- Decimal phases (7.1, 7.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 6: PR-FAQ Ingestion** - Users can feed a PR-FAQ document into BranchOS for project planning (completed 2026-03-09)
- [x] **Phase 7: Roadmap Generation and Feature Registry** - Users can generate a structured roadmap with trackable features from their PR-FAQ (completed 2026-03-10)
- [ ] **Phase 8: Feature-Aware Workstreams** - Developers can create workstreams linked to features with acceptance criteria in context
- [ ] **Phase 9: GitHub Issues Sync and Roadmap Refresh** - Users can push features to GitHub Issues and refresh the roadmap when the PR-FAQ evolves
- [ ] **Phase 10: Slash Command Migration** - All workflow commands available as slash commands with CLI reduced to bootstrapper

## Phase Details

### Phase 6: PR-FAQ Ingestion
**Goal**: Users can feed a product definition document into BranchOS as the foundation for all project planning
**Depends on**: Nothing (first phase of v2.0; builds on v1.0 infrastructure)
**Requirements**: PRFAQ-01, PRFAQ-02, PRFAQ-03
**Success Criteria** (what must be TRUE):
  1. User can run a command that copies their PR-FAQ.md into `.branchos/shared/` and confirms ingestion
  2. System prints warnings for missing PR-FAQ sections (e.g., no FAQ, no customer quotes) without blocking ingestion
  3. Re-ingesting an unchanged PR-FAQ reports "no changes detected" (content hash comparison works)
  4. Re-ingesting a modified PR-FAQ reports what changed and updates the stored copy
**Plans:** 2/2 plans complete

Plans:
- [ ] 06-01-PLAN.md -- Types, section validation, content hashing (pure functions + tests)
- [ ] 06-02-PLAN.md -- CLI command handler, slash command registration, wiring

### Phase 7: Roadmap Generation and Feature Registry
**Goal**: Users can generate a structured roadmap with individual trackable features from their ingested PR-FAQ
**Depends on**: Phase 6
**Requirements**: ROAD-01, ROAD-02, ROAD-03, FEAT-01, FEAT-02, FEAT-03
**Success Criteria** (what must be TRUE):
  1. User can run `/branchos:plan-roadmap` and get a ROADMAP.md with milestones, ordered features, and dependencies
  2. Each feature exists as its own file with YAML frontmatter (id, title, status, milestone, branch, issue) and markdown body containing acceptance criteria
  3. Features start in "unassigned" status and can transition through assigned, in-progress, and complete
  4. User can run `/branchos:features` and see a table of all features with their status, milestone, and branch name
  5. Generated feature files include branch name suggestions derived from feature titles
**Plans:** 3/3 plans complete

Plans:
- [ ] 07-01-PLAN.md -- Types, frontmatter, slug, feature file, and roadmap file modules (pure functions + tests)
- [ ] 07-02-PLAN.md -- plan-roadmap CLI handler, slash command registration, wiring
- [ ] 07-03-PLAN.md -- features CLI handler, slash command registration, wiring

### Phase 8: Feature-Aware Workstreams
**Goal**: Developers can create workstreams linked to specific features, with acceptance criteria automatically included in their context packets
**Depends on**: Phase 7
**Requirements**: WORK-01, WORK-02
**Success Criteria** (what must be TRUE):
  1. User can run workstream creation with `--feature <id>` and the workstream is created with the feature's branch name and linked metadata
  2. Context packets for a feature-linked workstream include the feature description and acceptance criteria alongside existing repo/workstream context
  3. Feature status updates to "in-progress" when a linked workstream is created
**Plans:** 2 plans

Plans:
- [ ] 08-01-PLAN.md -- Type extensions, GitOps branch methods, feature-linked workstream creation flow
- [ ] 08-02-PLAN.md -- Context packet featureContext integration, CLI --feature flag, archive completion prompt

### Phase 9: GitHub Issues Sync and Roadmap Refresh
**Goal**: Users can push features to GitHub Issues for team coordination and refresh the roadmap when the PR-FAQ evolves
**Depends on**: Phase 7
**Requirements**: GHIS-01, GHIS-02, ROAD-04, ROAD-05
**Success Criteria** (what must be TRUE):
  1. User can run `/branchos:sync-issues` and GitHub Issues are created for each feature using the `gh` CLI
  2. Re-running sync updates existing issues (idempotent) rather than creating duplicates, with issue numbers stored in feature frontmatter
  3. User can run `/branchos:refresh-roadmap` after modifying the PR-FAQ and see proposed roadmap changes
  4. Roadmap refresh preserves manual edits to feature files (does not blindly overwrite human prose)
**Plans:** 1/3 plans executed

Plans:
- [ ] 09-01-PLAN.md -- Foundation modules: types extension, gh CLI wrapper, similarity matching
- [ ] 09-02-PLAN.md -- sync-issues handler, CLI registration, slash command
- [ ] 09-03-PLAN.md -- refresh-roadmap handler, CLI registration, slash command

### Phase 10: Slash Command Migration
**Goal**: All BranchOS workflow commands are available as `/branchos:*` slash commands, with the CLI reduced to init and install-commands only
**Depends on**: Phase 9 (command set must be stable before finalizing migration)
**Requirements**: MIGR-01, MIGR-02
**Success Criteria** (what must be TRUE):
  1. Every v1 CLI workflow command (map-codebase, discuss, plan, execute, status, conflicts, archive) has a corresponding `/branchos:*` slash command
  2. CLI only exposes bootstrapper commands (init, install-commands) -- workflow commands removed or show deprecation warnings
  3. Slash commands work in both `commands/` and `skills/` directories for Claude Code compatibility
**Plans**: TBD

Plans:
- [ ] 10-01: TBD
- [ ] 10-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9 -> 10
(Phases 8 and 9 both depend on 7 but not each other; sequential execution is simpler)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. CLI and State Foundation | v1.0 | 3/3 | Complete | 2026-03-07 |
| 2. Codebase Mapping | v1.0 | 2/2 | Complete | 2026-03-08 |
| 3. Workflow Phases | v1.0 | 3/3 | Complete | 2026-03-08 |
| 4. Context Assembly | v1.0 | 2/2 | Complete | 2026-03-08 |
| 5. Team Coordination | v1.0 | 3/3 | Complete | 2026-03-09 |
| 6. PR-FAQ Ingestion | v2.0 | 2/2 | Complete | 2026-03-09 |
| 7. Roadmap and Feature Registry | v2.0 | 3/3 | Complete | 2026-03-10 |
| 8. Feature-Aware Workstreams | v2.0 | 0/2 | Not started | - |
| 9. GitHub Issues Sync and Roadmap Refresh | 1/3 | In Progress|  | - |
| 10. Slash Command Migration | v2.0 | 0/2 | Not started | - |
