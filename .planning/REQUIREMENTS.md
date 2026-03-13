# Requirements: BranchOS

**Defined:** 2026-03-13
**Core Value:** Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## v2.2 Requirements

Requirements for PR Workflow & Developer Experience milestone. Each maps to roadmap phases.

### PR Creation

- [ ] **PR-01**: Developer can create a GitHub PR from workstream context via `/branchos:create-pr`
- [ ] **PR-02**: PR body includes feature description from feature file
- [ ] **PR-03**: PR body includes phase summaries (discuss/plan/execute artifacts)
- [ ] **PR-04**: PR body includes acceptance criteria as checkable GWT checklist
- [ ] **PR-05**: PR body includes `Closes #N` linked issue reference when issue exists
- [ ] **PR-06**: PR body includes branch diff stats (files changed, insertions, deletions)
- [ ] **PR-07**: PR auto-assigned to workstream creator's GitHub username
- [ ] **PR-08**: PR targets repo default branch (with override support)
- [ ] **PR-09**: Confirmation flow shows assembled PR body before submitting
- [ ] **PR-10**: Idempotency check prevents duplicate PRs for same branch
- [ ] **PR-11**: PR body written via `--body-file` (not inline `--body`)

### Acceptance Criteria

- [x] **AC-01**: Feature files support Given/When/Then acceptance criteria format
- [x] **AC-02**: GWT parser handles Given, When, Then, And keywords
- [x] **AC-03**: Backward compatible — freeform criteria still work when GWT not present
- [x] **AC-04**: `plan-roadmap` generates GWT-formatted acceptance criteria for new features
- [x] **AC-05**: GWT criteria flow into context packets for discuss/plan/execute phases

### Issue-Linked Workstreams

- [x] **ISS-01**: `create-workstream --issue #N` fetches issue title/description from GitHub
- [x] **ISS-02**: Issue-linked workstream auto-links to feature if issue was created by sync-issues
- [x] **ISS-03**: Issue metadata (title, labels, body) stored in workstream context

### Assignee Tracking

- [x] **ASN-01**: GitHub username auto-captured via `gh api /user` on workstream creation
- [x] **ASN-02**: Username stored in workstream meta.json as `assignee` field
- [x] **ASN-03**: `sync-issues` sets assignee on GitHub Issues from workstream assignee
- [x] **ASN-04**: Assignee capture is non-blocking — graceful fallback if `gh` unavailable
- [x] **ASN-05**: Schema migration v2→v3 for new meta.json fields (assignee, issueNumber)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### PR Lifecycle

- **PRL-01**: PR update flow via `gh pr edit` when workstream progresses
- **PRL-02**: PR status tracking in workstream meta
- **PRL-03**: Draft PR creation option

### Advanced Assignee

- **AASN-01**: Multiple assignees per workstream
- **AASN-02**: Assignee validation against repo collaborators before sync

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-merge after PR creation | Dangerous; removes human review gate |
| PR template files in `.github/` | BranchOS assembles body dynamically; static templates conflict |
| Bidirectional issue sync | Explicitly out of scope per PROJECT.md; adds webhook/polling complexity |
| Multi-PR per workstream | One workstream = one branch = one PR; multi-PR adds state complexity |
| PR review/approval tracking | GitHub already tracks this; duplicating state creates drift |
| Auto-create workstreams from issues | Removes developer agency per PROJECT.md |
| Cucumber/step definition generation | GWT is for human-readable criteria, not test automation |
| PR status webhooks/notifications | Requires server component; BranchOS is CLI-only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AC-01 | Phase 15 | Complete |
| AC-02 | Phase 15 | Complete |
| AC-03 | Phase 15 | Complete |
| AC-04 | Phase 15 | Complete |
| AC-05 | Phase 15 | Complete |
| ASN-01 | Phase 16 | Complete |
| ASN-02 | Phase 16 | Complete |
| ASN-03 | Phase 18 | Complete |
| ASN-04 | Phase 16 | Complete |
| ASN-05 | Phase 16 | Complete |
| ISS-01 | Phase 17 | Complete |
| ISS-02 | Phase 17 | Complete |
| ISS-03 | Phase 17 | Complete |
| PR-01 | Phase 18 | Pending |
| PR-02 | Phase 18 | Pending |
| PR-03 | Phase 18 | Pending |
| PR-04 | Phase 18 | Pending |
| PR-05 | Phase 18 | Pending |
| PR-06 | Phase 18 | Pending |
| PR-07 | Phase 18 | Pending |
| PR-08 | Phase 18 | Pending |
| PR-09 | Phase 18 | Pending |
| PR-10 | Phase 18 | Pending |
| PR-11 | Phase 18 | Pending |

**Coverage:**
- v2.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 -- traceability updated with phase mappings*
