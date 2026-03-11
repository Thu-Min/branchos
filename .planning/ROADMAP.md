# Roadmap: BranchOS

## Milestones

- v1.0 BranchOS Initial Release -- Phases 1-5 (shipped 2026-03-09)
- v2.0 Project-Level Planning -- Phases 6-10 (shipped 2026-03-10)
- v2.1 Interactive Research -- Phases 11-14 (in progress)

## Phases

<details>
<summary>v1.0 BranchOS Initial Release (Phases 1-5) -- SHIPPED 2026-03-09</summary>

- [x] Phase 1: CLI and State Foundation (3/3 plans) -- completed 2026-03-07
- [x] Phase 2: Codebase Mapping (2/2 plans) -- completed 2026-03-08
- [x] Phase 3: Workflow Phases (3/3 plans) -- completed 2026-03-08
- [x] Phase 4: Context Assembly (2/2 plans) -- completed 2026-03-08
- [x] Phase 5: Team Coordination (3/3 plans) -- completed 2026-03-09

</details>

<details>
<summary>v2.0 Project-Level Planning (Phases 6-10) -- SHIPPED 2026-03-10</summary>

- [x] Phase 6: PR-FAQ Ingestion (2/2 plans) -- completed 2026-03-09
- [x] Phase 7: Roadmap Generation and Feature Registry (3/3 plans) -- completed 2026-03-10
- [x] Phase 8: Feature-Aware Workstreams (2/2 plans) -- completed 2026-03-10
- [x] Phase 9: GitHub Issues Sync and Roadmap Refresh (3/3 plans) -- completed 2026-03-10
- [x] Phase 10: Slash Command Migration (2/2 plans) -- completed 2026-03-10

</details>

### v2.1 Interactive Research (In Progress)

**Milestone Goal:** Add interactive, conversational research capabilities to BranchOS slash commands so developers get back-and-forth domain research integrated into their workflow.

- [x] **Phase 11: Research Storage Foundation** - Types, store, and persistent research artifacts with structured frontmatter and summary separation (completed 2026-03-11)
- [x] **Phase 12: Interactive Research Command** - Slash command with bookend pattern, interactive questioning, and conversational research flow (completed 2026-03-11)
- [ ] **Phase 13: Context Assembly Integration** - Research findings flow into discuss/plan context packets with summary-based inclusion
- [ ] **Phase 14: Discuss Project Command** - Interactive guided conversation that produces structured PR-FAQ committed to git

## Phase Details

### Phase 11: Research Storage Foundation
**Goal**: Developers can persist structured research artifacts that are ready for downstream consumption
**Depends on**: Nothing (first phase of v2.1)
**Requirements**: RES-03, RES-04, RES-05
**Success Criteria** (what must be TRUE):
  1. Running the research store creates a markdown file in `.branchos/shared/research/` with valid YAML frontmatter (topic, status, date, linked features)
  2. Each research artifact contains a `## Summary` section that can be extracted independently from the full findings
  3. Research artifacts can be linked to features via `researchRefs` and these links are retrievable from the store
  4. An `index.json` in the research directory provides fast lookup of all research topics without reading individual files
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md — Research types, generalized frontmatter parser, and extractSummary
- [ ] 11-02-PLAN.md — Research file store (CRUD) and index system with feature lookup

### Phase 12: Interactive Research Command
**Goal**: Developers can conduct interactive, conversational research sessions through a slash command
**Depends on**: Phase 11
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (what must be TRUE):
  1. `/branchos:research <topic>` starts a research session that loads codebase context and frames the research question
  2. The slash command uses structured decision points (options, multi-select) via AskUserQuestion for guiding research direction
  3. Users can provide freeform follow-up responses when structured options are insufficient
  4. `/branchos:research --save` compiles conversation findings into a persistent research artifact and commits to git
  5. The interactive flow adapts its questioning based on user responses rather than following a rigid script
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Research slash command with bookend pattern, AskUserQuestion integration, and --save persistence

### Phase 13: Context Assembly Integration
**Goal**: Research findings automatically enrich discuss and plan workflows without manual reference
**Depends on**: Phase 11
**Requirements**: CTX-01, CTX-02, CTX-03, RES-01, RES-02
**Success Criteria** (what must be TRUE):
  1. `/branchos:discuss-phase` automatically includes relevant research summaries in its context packet
  2. `/branchos:plan-roadmap` automatically includes relevant research summaries in its context packet
  3. Context assembly uses research summaries (not full artifacts) to stay within context window budget
  4. All existing commands work unchanged when no research artifacts exist (backward compatible)
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — ResearchSummaries field in AssemblyInput with TDD unit tests for discuss/plan inclusion
- [ ] 13-02-PLAN.md — Wire research gathering into contextHandler and update slash command documentation

### Phase 14: Discuss Project Command
**Goal**: Developers can create a structured PR-FAQ through an interactive guided conversation
**Depends on**: Phase 12, Phase 13
**Requirements**: DISC-01, DISC-02, DISC-03
**Success Criteria** (what must be TRUE):
  1. `/branchos:discuss-project` initiates a guided conversation that walks the developer through PR-FAQ sections
  2. The command uses the bookend pattern: frames the discussion at start, Claude Code drives conversation, explicit save at end
  3. The output is a structured PR-FAQ file committed to git that can be ingested by existing `/branchos:ingest-prfaq`
**Plans**: TBD

Plans:
- [ ] 14-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. CLI and State Foundation | v1.0 | 3/3 | Complete | 2026-03-07 |
| 2. Codebase Mapping | v1.0 | 2/2 | Complete | 2026-03-08 |
| 3. Workflow Phases | v1.0 | 3/3 | Complete | 2026-03-08 |
| 4. Context Assembly | v1.0 | 2/2 | Complete | 2026-03-08 |
| 5. Team Coordination | v1.0 | 3/3 | Complete | 2026-03-09 |
| 6. PR-FAQ Ingestion | v2.0 | 2/2 | Complete | 2026-03-09 |
| 7. Roadmap and Feature Registry | v2.0 | 3/3 | Complete | 2026-03-10 |
| 8. Feature-Aware Workstreams | v2.0 | 2/2 | Complete | 2026-03-10 |
| 9. GitHub Issues Sync and Refresh | v2.0 | 3/3 | Complete | 2026-03-10 |
| 10. Slash Command Migration | v2.0 | 2/2 | Complete | 2026-03-10 |
| 11. Research Storage Foundation | v2.1 | 2/2 | Complete | 2026-03-11 |
| 12. Interactive Research Command | v2.1 | Complete    | 2026-03-11 | 2026-03-11 |
| 13. Context Assembly Integration | v2.1 | 0/2 | Not started | - |
| 14. Discuss Project Command | v2.1 | 0/1 | Not started | - |
