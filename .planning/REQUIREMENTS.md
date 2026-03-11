# Requirements: BranchOS

**Defined:** 2026-03-11
**Core Value:** Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## v2.1 Requirements

Requirements for v2.1 Interactive Research milestone. Each maps to roadmap phases.

### Research Integration

- [ ] **RES-01**: `/branchos:discuss-phase` includes domain research grounded in codebase context
- [ ] **RES-02**: `/branchos:plan-roadmap` includes domain research before generating roadmap
- [ ] **RES-03**: Research findings persisted as structured markdown with YAML frontmatter in `.branchos/shared/research/`
- [ ] **RES-04**: Research artifacts linkable to features via `researchRefs`
- [ ] **RES-05**: Research artifacts include summary section for downstream consumption

### Context Integration

- [ ] **CTX-01**: Research findings flow into discuss/plan context packets automatically
- [ ] **CTX-02**: Context assembly uses summaries (not full artifacts) to manage context window
- [ ] **CTX-03**: Backward compatible — commands work unchanged when no research exists

### Interactive Flow

- [ ] **INT-01**: Slash commands use AskUserQuestion for structured decision points (options, multi-select)
- [ ] **INT-02**: Slash commands support freeform follow-up when user selects "Other" or wants to explain
- [ ] **INT-03**: Interactive flow guides users through research/discuss with adaptive questioning (not rigid scripts)

### Discuss Project

- [ ] **DISC-01**: `/branchos:discuss-project` creates PR-FAQ through interactive guided conversation
- [ ] **DISC-02**: Bookend pattern — slash command frames discussion, Claude Code drives conversation, explicit save
- [ ] **DISC-03**: Output is structured PR-FAQ committed to git

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Standalone Research

- **SRES-01**: Standalone `/branchos:research` command for ad-hoc research sessions
- **SRES-02**: Research listing and browsing (`--list`, `--view`)

### Multi-Session Research

- **MRES-01**: Research sessions spanning multiple Claude Code conversations via `status: in-progress`

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Autonomous research agents | BranchOS assists developers, doesn't replace them |
| Forced research gates | Research should enhance workflow, not block it |
| Custom REPL/terminal interaction | Claude Code's conversation loop handles interactivity |
| Research template proliferation | Keep artifact format simple — one format, not per-domain templates |
| New runtime dependencies | Zero new deps — Claude Code's WebSearch/WebFetch are the engine |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RES-01 | Phase 13 | Pending |
| RES-02 | Phase 13 | Pending |
| RES-03 | Phase 11 | Pending |
| RES-04 | Phase 11 | Pending |
| RES-05 | Phase 11 | Pending |
| CTX-01 | Phase 13 | Pending |
| CTX-02 | Phase 13 | Pending |
| CTX-03 | Phase 13 | Pending |
| INT-01 | Phase 12 | Pending |
| INT-02 | Phase 12 | Pending |
| INT-03 | Phase 12 | Pending |
| DISC-01 | Phase 14 | Pending |
| DISC-02 | Phase 14 | Pending |
| DISC-03 | Phase 14 | Pending |

**Coverage:**
- v2.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after roadmap creation*
