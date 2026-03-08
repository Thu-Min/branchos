# Roadmap: BranchOS

## Overview

BranchOS delivers team-based AI-assisted development workflows through five phases: first establishing the CLI scaffold and state management foundation that everything depends on, then building the shared codebase mapping layer, then structured workflow phases (discuss/plan/execute), then the high-value context assembly and Claude Code integration, and finally team coordination features (conflict detection, status, archival) that require multiple workstreams to exist.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: CLI and State Foundation** - CLI scaffolding, git integration, state manager, workstream CRUD, directory structure (completed 2026-03-07)
- [x] **Phase 2: Codebase Mapping** - Shared repo analysis, codebase map generation, staleness detection (completed 2026-03-08)
- [ ] **Phase 3: Workflow Phases** - Multi-phase workstream lifecycle with discuss, plan, and execute steps
- [ ] **Phase 4: Context Assembly** - Context packet assembly, slash command integration, phase-aware context injection
- [ ] **Phase 5: Team Coordination** - Conflict detection, workstream status overview, archival, branch-switch prompts

## Phase Details

### Phase 1: CLI and State Foundation
**Goal**: Developers can install BranchOS, initialize a repository, and create/manage workstreams with isolated, schema-versioned state
**Depends on**: Nothing (first phase)
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, STA-01, STA-02, STA-03, STA-04, WRK-01, WRK-02, WRK-06
**Success Criteria** (what must be TRUE):
  1. User can run `npm install -g branchos` and then `branchos --help` to see available commands
  2. User can run `branchos init` in a git repo and see `.branchos/shared/` and `.branchos/workstreams/` directories created
  3. User can create a workstream from a branch and see it stored under a stable internal ID (not the raw branch name)
  4. User can override workstream name with `--name` flag during creation
  5. All state files contain a `schemaVersion` field and `.branchos/` artifacts are committed to git
**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Project scaffold, build pipeline, and core utilities (schema, output, constants)
- [x] 01-02-PLAN.md — Git operations wrapper and branchos init command
- [x] 01-03-PLAN.md — Workstream create command with slug resolution and state files

### Phase 2: Codebase Mapping
**Goal**: Teams have a shared, persistent understanding of their codebase that stays current as the repo evolves
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-03
**Success Criteria** (what must be TRUE):
  1. User can run `branchos map-codebase` and see a generated codebase map covering architecture, modules, and conventions
  2. Codebase map is stored in `.branchos/shared/` and accessible to all workstreams
  3. When the codebase map falls behind HEAD by N commits, BranchOS warns the user and suggests a refresh
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — Slash command prompt template, map metadata parsing, config extension, warning output
- [x] 02-02-PLAN.md — Staleness detection and branchos map-status CLI command

### Phase 3: Workflow Phases
**Goal**: Each workstream supports a structured multi-phase workflow where developers discuss, plan, and execute with tracked progress and captured decisions
**Depends on**: Phase 1
**Requirements**: WFL-01, WFL-02, WFL-03, WFL-04, WFL-05, WFL-06, TEM-03
**Success Criteria** (what must be TRUE):
  1. User can advance a workstream through multiple phases, each with discuss, plan, and execute steps
  2. User can run `branchos discuss-phase`, `branchos plan-phase`, and `branchos execute-phase` to produce workstream-scoped artifacts
  3. Phase artifacts (discuss.md, plan.md, execute.md) are stored in the workstream directory, not shared space
  4. BranchOS can compare planned work against actual git commits and report drift
  5. Decisions made during discuss/plan are captured in a workstream-scoped decision log
**Plans:** 2/3 plans executed

Plans:
- [ ] 03-01-PLAN.md — State schema v2 migration, phase lifecycle functions, and decision log module
- [ ] 03-02-PLAN.md — Three slash command prompt templates and CLI phase-commands wrapper
- [ ] 03-03-PLAN.md — Drift detection: compare planned work against actual git commits

### Phase 4: Context Assembly
**Goal**: Claude Code receives focused, phase-appropriate context packets that combine shared repo knowledge with workstream-specific state
**Depends on**: Phase 1, Phase 2, Phase 3
**Requirements**: CTX-01, CTX-02, CTX-03
**Success Criteria** (what must be TRUE):
  1. BranchOS assembles a context packet combining shared repo baseline, workstream metadata, branch diff summary, current plan, and execution state
  2. Context packets are delivered via Claude Code slash commands installed in `.claude/commands/`
  3. Context assembly is phase-aware: discuss phase gets architecture and conventions, plan phase gets discuss output and patterns, execute phase gets plan and test patterns
**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Context assembly module with step detection, section composition, and GitOps extensions
- [ ] 04-02-PLAN.md — CLI context command, slash command wrapper, and hint lines on existing commands

### Phase 5: Team Coordination
**Goal**: Developers can see what their teammates are working on, detect file-level conflicts early, and cleanly close out completed workstreams
**Depends on**: Phase 1, Phase 3
**Requirements**: WRK-03, WRK-04, WRK-05, TEM-01, TEM-02
**Success Criteria** (what must be TRUE):
  1. User can run `branchos status` to see all active workstreams with their branches, phases, and last activity
  2. User can run `branchos detect-conflicts` to find file-level overlap between active workstreams
  3. When two workstreams have planned or actual changes to the same files, conflict detection warns the user
  4. User can archive a completed workstream after its branch merges
  5. When user switches to a branch with no workstream, BranchOS prompts to create one
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. CLI and State Foundation | 3/3 | Complete   | 2026-03-07 |
| 2. Codebase Mapping | 2/2 | Complete | 2026-03-08 |
| 3. Workflow Phases | 2/3 | In Progress|  |
| 4. Context Assembly | 0/2 | Not started | - |
| 5. Team Coordination | 0/0 | Not started | - |
