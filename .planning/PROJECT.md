# BranchOS

## What This Is

A CLI-first terminal tool for team-based development with Claude Code that brings GSD's proven phase-driven workflow (map-codebase, discuss, plan, execute) to shared repositories. BranchOS isolates planning and execution state by workstream/branch so multiple developers can run the workflow simultaneously without overwriting each other's context.

## Core Value

Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] CLI tool installable via npm (`npm install -g branchos`)
- [ ] Codebase mapping with shared repo context (architecture, modules, conventions)
- [ ] Workstream creation/resolution with auto-ID from branch name (with --name override)
- [ ] Multi-phase workstreams (discuss-phase, plan-phase, execute-phase per phase)
- [ ] Workstream-scoped state storage (`.branchos/workstreams/<id>/`)
- [ ] Shared repo-level context storage (`.branchos/shared/`)
- [ ] Branch-aware context assembly via slash commands for Claude Code
- [ ] Machine-readable progress tracking per workstream (state.json)
- [ ] Git-aware reconciliation (diff, commits vs plan)
- [ ] File-level cross-workstream conflict detection
- [ ] Workstream status command
- [ ] Workstream archival after branch merge
- [ ] Staleness detection for codebase map (suggest refresh when N commits behind)
- [ ] Prompt to create workstream when switching to unmapped branch
- [ ] All artifacts committed to git

### Out of Scope

- Web dashboard — terminal-first, no UI beyond CLI
- Multi-repo orchestration — single repo focus for v1
- Autonomous multi-agent swarm — tool assists developers, doesn't replace them
- Issue tracker integrations — no Jira/Linear/GitHub Issues in v1
- PR automation — no auto-PR creation
- Real-time collaboration server — async, file-based coordination
- Module-level conflict detection — file-level only in v1
- GSD command compatibility — own namespace (`branchos` not `/gsd`)

## Context

- Inspired by GSD (get-shit-done), which works well solo but breaks in teams due to shared `.planning/` state
- Root cause: GSD models planning as one shared thread; teams need isolated workstreams sharing repo knowledge
- Target: small teams (2-5 devs) working on parallel features in separate branches
- Built as Claude Code integration — slash commands that read state and inject into Claude's prompt
- Node.js / TypeScript codebase
- Workstream size varies: could be a focused task (1-2 phases) or a full feature (5+ phases)

### Two-Layer State Model

**Shared repo layer** (`.branchos/shared/`):
- Codebase map, architecture summary, conventions, repo-level decisions
- Updated via `branchos map-codebase`, with staleness detection

**Workstream layer** (`.branchos/workstreams/<id>/`):
- Branch metadata, discuss/plan/execute artifacts, execution state, blockers
- Scoped to one feature/branch/task, isolated from other workstreams

### Context Packet Model

When Claude Code runs a slash command, BranchOS assembles context from:
1. Shared repo baseline
2. Current workstream metadata
3. Current branch diff summary
4. Current plan and execution state
5. Relevant decisions only

This prevents context bleed from unrelated workstreams.

## Constraints

- **Stack**: Node.js / TypeScript — npm distribution, familiar ecosystem
- **Integration**: Claude Code slash commands — not standalone, not CLAUDE.md injection
- **Distribution**: npm package (`npm install -g branchos`)
- **Git**: All `.branchos/` artifacts committed to git
- **Team size**: Designed for 2-5 developers in v1
- **Conflict detection**: File-level only in v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Own command namespace (`branchos`) | Clean break from GSD — different product, different mental model | — Pending |
| Slash commands for context delivery | Keeps context injection explicit and controllable vs magic CLAUDE.md updates | — Pending |
| Workstream ID auto-derived from branch | Zero friction default; --name override for custom naming | — Pending |
| File-level conflict detection only | Simple, reliable, shippable — module inference adds complexity without proven value | — Pending |
| All artifacts committed to git | Shared visibility, survives branch switches, team coordination | — Pending |
| Archive workstreams on merge | Preserves history without cluttering active workspace | — Pending |
| Multi-phase workstreams | Workstream size varies; single-phase would be too restrictive | — Pending |
| Prompt on unmapped branch | Explicit workstream creation prevents accidental state attachment | — Pending |
| Staleness detection for codebase map | Auto-detect when map is behind, suggest refresh — better than manual-only | — Pending |

---
*Last updated: 2026-03-07 after initialization*
