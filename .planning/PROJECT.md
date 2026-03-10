# BranchOS

## What This Is

A CLI-first terminal tool for team-based development with Claude Code that brings structured phase-driven workflows (map-codebase, discuss, plan, execute) to shared repositories. BranchOS provides a project-level planning layer — from PR-FAQ ingestion through roadmap generation, feature registry, and GitHub Issues — with workstream-scoped state isolation so multiple developers can work simultaneously.

## Core Value

Multiple developers can run structured AI-assisted workflows in the same repository without corrupting each other's planning state.

## Requirements

### Validated

- ✓ CLI tool installable via npm (`npm install -g branchos`) — v1.0
- ✓ Codebase mapping with shared repo context (architecture, modules, conventions) — v1.0
- ✓ Workstream creation/resolution with auto-ID from branch name (with --name override) — v1.0
- ✓ Multi-phase workstreams (discuss-phase, plan-phase, execute-phase per phase) — v1.0
- ✓ Workstream-scoped state storage (`.branchos/workstreams/<id>/`) — v1.0
- ✓ Shared repo-level context storage (`.branchos/shared/`) — v1.0
- ✓ Branch-aware context assembly via slash commands for Claude Code — v1.0
- ✓ Machine-readable progress tracking per workstream (state.json) — v1.0
- ✓ Git-aware reconciliation (diff, commits vs plan) — v1.0
- ✓ File-level cross-workstream conflict detection — v1.0
- ✓ Workstream status command — v1.0
- ✓ Workstream archival after branch merge — v1.0
- ✓ Staleness detection for codebase map (suggest refresh when N commits behind) — v1.0
- ✓ Prompt to create workstream when switching to unmapped branch — v1.0
- ✓ All artifacts committed to git — v1.0
- ✓ PR-FAQ ingestion with structure validation and content-hash change detection — v2.0
- ✓ Roadmap generation from PR-FAQ with milestones, features, and dependencies — v2.0
- ✓ Roadmap refresh when PR-FAQ changes (preserves manual edits) — v2.0
- ✓ Feature registry with YAML frontmatter, status lifecycle, and acceptance criteria — v2.0
- ✓ GitHub Issues sync from features (idempotent create/update via gh CLI) — v2.0
- ✓ Feature-aware workstream creation with --feature flag — v2.0
- ✓ Enhanced context assembly (feature description + acceptance criteria in packets) — v2.0
- ✓ All CLI workflow commands migrated to `/branchos:*` slash commands — v2.0
- ✓ CLI reduced to bootstrapper (init, install-commands) — v2.0

### Active

(None — planning next milestone)

### Out of Scope

- Web dashboard — terminal-first, no UI beyond CLI
- Multi-repo orchestration — single repo focus
- Autonomous multi-agent swarm — tool assists developers, doesn't replace them
- PR automation — no auto-PR creation
- Real-time collaboration server — async, file-based coordination
- Module-level conflict detection — file-level only (proven sufficient in v1.0)
- GSD command compatibility — own namespace (`branchos` not `/gsd`)
- Undo/rollback of workstream state — git already provides this
- Bidirectional GitHub issue sync — defer to v3+, depends on one-way sync working well first
- Auto-detect PR-FAQ changes — explicit `/branchos:refresh-roadmap` instead
- Assignment system in BranchOS — GitHub already has assignment, labels, boards
- Auto-create workstreams from features — removes developer agency

## Context

Shipped v2.0 with 10,870 LOC TypeScript.
Tech stack: Node.js 20+, TypeScript, Commander, simple-git, tsup, vitest.
46 requirements satisfied across 10 phases (v1.0 + v2.0).
14 slash commands, CLI bootstrapper-only architecture.

### Two-Layer State Model

**Shared repo layer** (`.branchos/shared/`):
- Codebase map, architecture summary, conventions, repo-level decisions
- PR-FAQ, ROADMAP.md, feature files
- Updated via `branchos map-codebase` / slash commands, with staleness detection

**Workstream layer** (`.branchos/workstreams/<id>/`):
- Branch metadata, discuss/plan/execute artifacts, execution state, blockers
- Feature link (optional) with acceptance criteria
- Scoped to one feature/branch/task, isolated from other workstreams

### Context Packet Model

When Claude Code runs a slash command, BranchOS assembles context from:
1. Shared repo baseline
2. Feature description and acceptance criteria (if linked)
3. Current workstream metadata
4. Current branch diff summary
5. Current plan and execution state
6. Relevant decisions only

## Constraints

- **Stack**: Node.js / TypeScript — npm distribution, familiar ecosystem
- **Integration**: Claude Code slash commands — not standalone, not CLAUDE.md injection
- **Distribution**: npm package (`npm install -g branchos`)
- **Git**: All `.branchos/` artifacts committed to git
- **Team size**: Designed for 2-5 developers
- **Conflict detection**: File-level only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Own command namespace (`branchos`) | Clean break from GSD — different product, different mental model | ✓ Good |
| Slash commands for context delivery | Keeps context injection explicit and controllable vs magic CLAUDE.md updates | ✓ Good |
| Workstream ID auto-derived from branch | Zero friction default; --name override for custom naming | ✓ Good |
| File-level conflict detection only | Simple, reliable, shippable — module inference adds complexity without proven value | ✓ Good |
| All artifacts committed to git | Shared visibility, survives branch switches, team coordination | ✓ Good |
| Archive workstreams on merge | Preserves history without cluttering active workspace | ✓ Good |
| Multi-phase workstreams | Workstream size varies; single-phase would be too restrictive | ✓ Good |
| Prompt on unmapped branch | Explicit workstream creation prevents accidental state attachment | ✓ Good |
| Staleness detection for codebase map | Auto-detect when map is behind, suggest refresh — better than manual-only | ✓ Good |
| type:module with CJS build output | Modern Node.js compat with .cjs extension matching bin entry | ✓ Good |
| Chained schema migration (v0->v1->v2) | All schema versions migrate correctly through intermediate steps | ✓ Good |
| Pure context assembly function | No I/O in assembleContext for easy testing; callers resolve data | ✓ Good |
| ensureWorkstream gate on commands | Single integration point prevents workstream-less command execution | ✓ Good |
| Slash-command-only architecture | All workflow commands via `/branchos:*` in Claude Code; CLI reduced to bootstrapper | ✓ Good |
| PR-FAQ as input, not generated | Product Owner provides PR-FAQ; BranchOS ingests and tracks changes | ✓ Good |
| Explicit refresh-roadmap command | No auto-detection of PR-FAQ drift; team runs `/branchos:refresh-roadmap` when ready | ✓ Good |
| GitHub Issues for assignment | Don't rebuild what exists; GitHub has assignment, labels, boards, discussion | ✓ Good |
| Hand-rolled YAML frontmatter parser | No gray-matter dependency; simple, tested, zero-dep | ✓ Good |
| execFile over exec for gh CLI | Prevents shell injection via argument arrays | ✓ Good |
| Title similarity matching for refresh | Greedy best-match with 0.6 threshold; simple, deterministic, no dependency | ✓ Good |
| Soft delete for dropped features | Files kept with status=dropped; preserves history | ✓ Good |

---
*Last updated: 2026-03-10 after v2.0 milestone completed*
