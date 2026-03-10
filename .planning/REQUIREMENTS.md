# Requirements: BranchOS

**Defined:** 2026-03-09
**Core Value:** Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## v2.0 Requirements

Requirements for project-level planning layer. Each maps to roadmap phases.

### PR-FAQ Ingestion

- [x] **PRFAQ-01**: User can ingest a PO-provided PR-FAQ.md into `.branchos/shared/PR-FAQ.md`
- [x] **PRFAQ-02**: System validates PR-FAQ structure and warns on missing sections (lenient, not strict)
- [x] **PRFAQ-03**: System stores content hash of PR-FAQ for change detection

### Roadmap Generation

- [x] **ROAD-01**: User can generate ROADMAP.md from PR-FAQ via `/branchos:plan-roadmap`
- [x] **ROAD-02**: Generated roadmap contains milestones with ordered features and dependencies
- [x] **ROAD-03**: System generates individual feature files with acceptance criteria and branch names
- [ ] **ROAD-04**: User can refresh roadmap when PR-FAQ changes via `/branchos:refresh-roadmap`
- [ ] **ROAD-05**: Roadmap refresh preserves manual edits to feature files where possible

### Feature Registry

- [x] **FEAT-01**: Feature files use YAML frontmatter (id, title, status, milestone, branch, issue) with markdown body
- [x] **FEAT-02**: Features follow status lifecycle: unassigned → assigned → in-progress → complete
- [x] **FEAT-03**: User can list all features with status, milestone, and branch via `/branchos:features`

### GitHub Issues Sync

- [ ] **GHIS-01**: User can create GitHub Issues from features via `/branchos:sync-issues` using `gh` CLI
- [ ] **GHIS-02**: Sync is idempotent — re-running updates existing issues, stores issue number in frontmatter

### Workstream Enhancement

- [x] **WORK-01**: User can create workstream with `--feature <id>` to pre-load feature context and branch name
- [ ] **WORK-02**: Context assembly includes feature description and acceptance criteria for linked workstreams

### Slash Command Migration

- [ ] **MIGR-01**: All v1 CLI workflow commands migrated to `/branchos:*` slash commands
- [ ] **MIGR-02**: CLI reduced to bootstrapper commands only (init, install-commands)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Bidirectional Sync

- **BSYNC-01**: Pull issue status from GitHub back to feature files
- **BSYNC-02**: Cross-milestone dependency visualization

### Reporting

- **REPT-01**: Feature completion reports per milestone

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| PR-FAQ generation/brainstorming | PO writes PR-FAQ — BranchOS respects the product owner role, not AI-generating requirements |
| Auto-detect PR-FAQ changes | Creates surprise regeneration; explicit `/branchos:refresh-roadmap` instead |
| Assignment system in BranchOS | GitHub already has assignment, labels, boards — don't rebuild what exists |
| Real-time sync with GitHub | Polling is fragile and rate-limited; explicit sync commands instead |
| Multi-repo roadmaps | Single-repo focus; coordinate at GitHub project board level |
| Web dashboard | Terminal-first product; use GitHub project boards for visual tracking |
| Auto-create workstreams from features | Removes developer agency; deliberate creation with `--feature` flag |
| Gantt charts / timeline views | CLI renders poorly as charts; milestones have order, not dates |
| Bidirectional issue sync | Defer to v3+ — high complexity, depends on one-way sync working well first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRFAQ-01 | Phase 6 | Complete |
| PRFAQ-02 | Phase 6 | Complete |
| PRFAQ-03 | Phase 6 | Complete |
| ROAD-01 | Phase 7 | Complete |
| ROAD-02 | Phase 7 | Complete |
| ROAD-03 | Phase 7 | Complete |
| ROAD-04 | Phase 9 | Pending |
| ROAD-05 | Phase 9 | Pending |
| FEAT-01 | Phase 7 | Complete |
| FEAT-02 | Phase 7 | Complete |
| FEAT-03 | Phase 7 | Complete |
| GHIS-01 | Phase 9 | Pending |
| GHIS-02 | Phase 9 | Pending |
| WORK-01 | Phase 8 | Complete |
| WORK-02 | Phase 8 | Pending |
| MIGR-01 | Phase 10 | Pending |
| MIGR-02 | Phase 10 | Pending |

**Coverage:**
- v2.0 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
