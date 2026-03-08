# Requirements: BranchOS

**Defined:** 2026-03-07
**Core Value:** Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### CLI Foundation

- [x] **CLI-01**: User can install BranchOS globally via `npm install -g branchos`
- [x] **CLI-02**: User can run `branchos init` to create `.branchos/` directory structure and configuration
- [x] **CLI-03**: User can run `branchos --help` to see all available commands with descriptions
- [x] **CLI-04**: CLI works on macOS and Linux with Node.js 18+

### Workstream Management

- [x] **WRK-01**: User can create a workstream that auto-derives its ID from the current git branch name
- [x] **WRK-02**: User can override the auto-derived workstream ID with a `--name` flag
- [ ] **WRK-03**: User can run `branchos status` to see all active workstreams, their branches, phases, and last activity
- [ ] **WRK-04**: User can archive a completed workstream after its branch merges
- [ ] **WRK-05**: When user switches to a branch with no workstream, BranchOS prompts to create one
- [x] **WRK-06**: Workstreams use stable internal IDs for directory storage (not raw branch names) to survive branch renames

### State & Storage

- [x] **STA-01**: State is organized in two layers: shared repo context (`.branchos/shared/`) and workstream-scoped state (`.branchos/workstreams/<id>/`)
- [x] **STA-02**: Each workstream has machine-readable progress tracking via `state.json` with tasks, status, blockers, and remaining work
- [x] **STA-03**: All `.branchos/` artifacts are committed to git for team visibility
- [x] **STA-04**: Every state file includes a `schemaVersion` field for forward-compatible schema evolution

### Codebase Mapping

- [x] **MAP-01**: User can run `branchos map-codebase` to generate a shared codebase map (architecture, modules, conventions)
- [x] **MAP-02**: Codebase map is stored in `.branchos/shared/` and reused by all workstreams
- [ ] **MAP-03**: BranchOS detects when the codebase map is stale (N commits behind HEAD) and suggests a refresh

### Workflow Phases

- [ ] **WFL-01**: Each workstream supports multiple phases, each with discuss, plan, and execute steps
- [ ] **WFL-02**: User can run `branchos discuss-phase` to build workstream-specific discussion context (goal, requirements, assumptions, unknowns)
- [ ] **WFL-03**: User can run `branchos plan-phase` to create an implementation plan (tasks, dependencies, affected files, risks)
- [ ] **WFL-04**: User can run `branchos execute-phase` to update execution state (completed tasks, remaining work, blockers)
- [ ] **WFL-05**: Phase artifacts (discuss.md, plan.md, execute.md) are scoped to the current workstream directory
- [ ] **WFL-06**: BranchOS reconciles planned work against actual git commits to detect drift from plan

### Context Assembly

- [ ] **CTX-01**: BranchOS assembles a focused context packet for Claude Code combining: shared repo baseline, workstream metadata, branch diff summary, current plan, and execution state
- [ ] **CTX-02**: Context packets are delivered via Claude Code slash commands
- [ ] **CTX-03**: Context assembly is phase-aware — discuss phase gets architecture + conventions, plan phase gets discuss output + patterns, execute phase gets plan + test patterns

### Team Coordination

- [ ] **TEM-01**: User can run `branchos detect-conflicts` to identify file-level overlap between active workstreams
- [ ] **TEM-02**: Conflict detection warns when two workstreams have planned or actual changes to the same files
- [ ] **TEM-03**: Decisions made during discuss/plan phases are captured in a workstream-scoped decision log

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Workstream Templates

- **TPL-01**: User can start a workstream from a template (bugfix, feature, refactor) with different default phase structures

### Module-Level Conflict Detection

- **MOD-01**: Conflict detection infers module boundaries from directory structure for broader overlap warnings

### Context Optimization

- **OPT-01**: Token budgeting per context layer to prevent context packet size explosion
- **OPT-02**: Context relevance scoring to prioritize most useful information

### Workstream Collaboration

- **COL-01**: Multiple developers can contribute to the same workstream on the same branch

## Out of Scope

| Feature | Reason |
|---------|--------|
| Web dashboard | Terminal-first; a dashboard implies server, auth, deployment — none serve core value |
| Real-time collaboration server | Git-based async coordination is the design choice, not a limitation |
| Autonomous multi-agent swarm | BranchOS assists developers, doesn't replace them |
| Issue tracker integration (Jira/Linear/GitHub) | Maintenance nightmare; every team uses something different |
| PR automation | Conflates workflow management with git hosting conventions |
| Multi-repo orchestration | Fundamentally different problem; each repo gets its own `.branchos/` |
| Editor/IDE integration | Slash commands work in any terminal; editor-agnostic by design |
| Built-in AI model management | Claude Code already handles model selection and API keys |
| Undo/rollback of workstream state | Git already provides this via standard tools |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 1 | Complete |
| WRK-01 | Phase 1 | Complete |
| WRK-02 | Phase 1 | Complete |
| WRK-03 | Phase 5 | Pending |
| WRK-04 | Phase 5 | Pending |
| WRK-05 | Phase 5 | Pending |
| WRK-06 | Phase 1 | Complete |
| STA-01 | Phase 1 | Complete |
| STA-02 | Phase 1 | Complete |
| STA-03 | Phase 1 | Complete |
| STA-04 | Phase 1 | Complete |
| MAP-01 | Phase 2 | Complete |
| MAP-02 | Phase 2 | Complete |
| MAP-03 | Phase 2 | Pending |
| WFL-01 | Phase 3 | Pending |
| WFL-02 | Phase 3 | Pending |
| WFL-03 | Phase 3 | Pending |
| WFL-04 | Phase 3 | Pending |
| WFL-05 | Phase 3 | Pending |
| WFL-06 | Phase 3 | Pending |
| CTX-01 | Phase 4 | Pending |
| CTX-02 | Phase 4 | Pending |
| CTX-03 | Phase 4 | Pending |
| TEM-01 | Phase 5 | Pending |
| TEM-02 | Phase 5 | Pending |
| TEM-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after roadmap creation*
