# Roadmap: BranchOS

## Milestones

- v1.0 BranchOS Initial Release -- Phases 1-5 (shipped 2026-03-09)
- v2.0 Project-Level Planning -- Phases 6-10 (shipped 2026-03-10)
- v2.1 Interactive Research -- Phases 11-14 (shipped 2026-03-11)
- v2.2 PR Workflow & Developer Experience -- Phases 15-18 (in progress)

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

<details>
<summary>v2.1 Interactive Research (Phases 11-14) -- SHIPPED 2026-03-11</summary>

- [x] Phase 11: Research Storage Foundation (2/2 plans) -- completed 2026-03-11
- [x] Phase 12: Interactive Research Command (1/1 plan) -- completed 2026-03-11
- [x] Phase 13: Context Assembly Integration (2/2 plans) -- completed 2026-03-11
- [x] Phase 14: Discuss Project Command (1/1 plan) -- completed 2026-03-11

</details>

### v2.2 PR Workflow & Developer Experience (In Progress)

**Milestone Goal:** Streamline the PR-to-merge lifecycle with auto-PR creation, structured acceptance criteria, issue-linked workstreams, and automatic assignee tracking.

- [x] **Phase 15: GWT Acceptance Criteria** - Feature files support Given/When/Then format with backward-compatible freeform fallback (completed 2026-03-13)
- [x] **Phase 16: Assignee Capture & Schema Migration** - Automatic GitHub username capture on workstream creation with schema v3 migration (completed 2026-03-13)
- [ ] **Phase 17: Issue-Linked Workstreams** - Create workstreams from GitHub issues with auto-feature linking
- [ ] **Phase 18: Create-PR Command & Assignee Sync** - One-command PR creation from workstream artifacts with assignee propagation

## Phase Details

### Phase 15: GWT Acceptance Criteria
**Goal**: Developers can write and consume structured Given/When/Then acceptance criteria in feature files
**Depends on**: Nothing (independent foundation)
**Requirements**: AC-01, AC-02, AC-03, AC-04, AC-05
**Success Criteria** (what must be TRUE):
  1. Feature files with Given/When/Then blocks parse into structured criteria objects
  2. Feature files without GWT (plain checklists) continue to work unchanged
  3. `plan-roadmap` generates GWT-formatted acceptance criteria for new features
  4. Context packets for discuss/plan/execute include parsed GWT criteria
  5. GWT parser handles Given, When, Then, and And keywords correctly
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md &mdash; GWT parser with TDD (types, parser, formatter)
- [ ] 15-02-PLAN.md &mdash; Context assembly integration and plan-roadmap GWT format

### Phase 16: Assignee Capture & Schema Migration
**Goal**: Workstreams automatically know which developer created them
**Depends on**: Nothing (independent foundation)
**Requirements**: ASN-01, ASN-02, ASN-04, ASN-05
**Success Criteria** (what must be TRUE):
  1. Running `create-workstream` captures the GitHub username into workstream metadata without prompting
  2. Workstream creation succeeds even when `gh` CLI is unavailable (assignee is null, no error)
  3. Existing workstreams migrate cleanly to schema v3 with null assignee and issueNumber fields
  4. `meta.json` contains `assignee` and `issueNumber` fields after migration
**Plans**: 1 plan

Plans:
- [ ] 16-01-PLAN.md -- Schema migration v2-to-v3, captureAssignee function, createWorkstream wiring (TDD)

### Phase 17: Issue-Linked Workstreams
**Goal**: Developers can create workstreams directly from GitHub issues
**Depends on**: Phase 16 (needs assignee and issueNumber meta fields)
**Requirements**: ISS-01, ISS-02, ISS-03
**Success Criteria** (what must be TRUE):
  1. `create-workstream --issue #N` fetches the issue and populates workstream context from its title and description
  2. If the issue was created by `sync-issues`, the workstream auto-links to the corresponding feature
  3. Issue metadata (title, labels, body) is stored in workstream context and available in context packets
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md -- fetchIssue helper, findFeatureByIssue reverse-lookup, issue-linked createWorkstream path, context assembly integration

### Phase 18: Create-PR Command & Assignee Sync
**Goal**: Developers can create a complete, well-structured GitHub PR with one command
**Depends on**: Phase 15 (GWT for PR body), Phase 16 (assignee for PR assignment), Phase 17 (issue number for Closes #N)
**Requirements**: PR-01, PR-02, PR-03, PR-04, PR-05, PR-06, PR-07, PR-08, PR-09, PR-10, PR-11, ASN-03
**Success Criteria** (what must be TRUE):
  1. `/branchos:create-pr` assembles a PR body from feature description, phase summaries, GWT checklist, linked issue, and diff stats
  2. Developer sees the assembled PR body and confirms before submission
  3. PR is auto-assigned to the workstream creator's GitHub username
  4. Running the command twice on the same branch does not create a duplicate PR
  5. `sync-issues` sets the assignee on GitHub Issues from workstream assignee metadata
**Plans**: TBD

Plans:
- [ ] 18-01: PR body assembly and gh pr create wrapper
- [ ] 18-02: Slash command, confirmation flow, and assignee sync

## Progress

**Execution Order:** 15 -> 16 -> 17 -> 18 (15 and 16 are independent; 17 depends on 16; 18 depends on all)

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
| 12. Interactive Research Command | v2.1 | 1/1 | Complete | 2026-03-11 |
| 13. Context Assembly Integration | v2.1 | 2/2 | Complete | 2026-03-11 |
| 14. Discuss Project Command | v2.1 | 1/1 | Complete | 2026-03-11 |
| 15. GWT Acceptance Criteria | 2/2 | Complete    | 2026-03-13 | - |
| 16. Assignee Capture & Schema Migration | 1/1 | Complete    | 2026-03-13 | - |
| 17. Issue-Linked Workstreams | v2.2 | 0/1 | Not started | - |
| 18. Create-PR Command & Assignee Sync | v2.2 | 0/2 | Not started | - |

---
*Roadmap created: 2026-03-07*
*Last updated: 2026-03-13 -- v2.2 phases added*
