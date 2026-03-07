# Feature Landscape

**Domain:** CLI-first team developer workflow / AI coding coordination tools
**Researched:** 2026-03-07
**Confidence:** MEDIUM (based on training data through early 2025 for competitor tools; web verification unavailable)

## Competitive Landscape Context

BranchOS sits at the intersection of two categories:

1. **AI coding assistants** (Aider, Cursor, Continue, Claude Code) -- tools that help individual developers write code with AI
2. **Developer workflow/coordination tools** (GSD, task runners, branch management) -- tools that structure how work gets done

No existing tool does both well for teams. Aider is single-developer. Cursor is editor-bound. GSD is solo-workflow. BranchOS's opportunity is the gap: structured AI-assisted workflows that work across a team sharing a repo.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Workstream isolation** | Core promise -- if two devs' state clobbers each other, the tool is broken | High | Two-layer model (shared + workstream) already designed. This is THE reason BranchOS exists. |
| **Branch-aware context** | Developers think in branches; tool must auto-detect current branch and load right state | Low | `git branch --show-current` plus mapping to workstream ID. Users expect zero-config default. |
| **Codebase mapping / indexing** | AI tools need repo understanding to be useful; Aider, Cursor, Continue all do this | Med | Shared layer. Must handle large repos without choking. Staleness detection already planned. |
| **Structured workflow phases** | GSD users expect discuss/plan/execute. Without structure, it's just a chatbot wrapper | Med | Multi-phase per workstream. Key: phases should be lightweight, not ceremonial. |
| **Progress tracking** | Users need to know "where am I in this workstream?" at a glance | Low | `state.json` per workstream. Must be machine-readable AND human-scannable. |
| **Workstream lifecycle** | Create, work, complete, archive. Full lifecycle or state accumulates forever | Med | Create on branch, archive on merge. Must handle abandoned workstreams too. |
| **CLI installability** | `npm install -g` and it works. No server setup, no config ceremony | Low | Standard npm distribution. Must work on macOS and Linux at minimum. |
| **Git integration** | All state in git so team sees it. This is how async coordination works without a server | Med | `.branchos/` committed. Must handle merge conflicts in state files gracefully. |
| **Context assembly for AI** | The actual value: feeding the right context to Claude Code at the right time | High | Context packet model. Must be selective (not dump everything) and fast. |
| **Workstream status overview** | "What's everyone working on?" Single command to see all active workstreams | Low | List workstreams, their branches, phases, last activity. Team situational awareness. |

## Differentiators

Features that set BranchOS apart. Not expected (no competitor does them), but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Cross-workstream conflict detection** | "Hey, Alice and Bob are both editing `auth.ts`" -- catches coordination failures before merge conflicts | Med | File-level in v1 is the right call. No other AI coding tool does this. Biggest differentiator. |
| **Shared repo knowledge layer** | Architecture, conventions, decisions shared across all workstreams -- new devs inherit team context | Med | `.branchos/shared/` with codebase map. Aider/Cursor index per-session; BranchOS persists and shares. |
| **Workstream-scoped decision log** | "Why did we do X in this feature?" captured during discuss/plan, available during execute | Low | Decisions made in discuss phase feed into plan/execute context. No competitor captures this per-feature. |
| **Git-aware plan reconciliation** | "You planned to change files A, B, C. You've committed changes to A, B. C remains." | High | Diffing commits against plan. Requires structured plans with file-level granularity. Very valuable for long-running features. |
| **Staleness detection** | Auto-detect when codebase map is behind HEAD by N commits; prompt to refresh | Low | Simple commit counting. Prevents stale context without manual tracking. |
| **Branch-switch prompt** | "You're on an unmapped branch. Create a workstream?" | Low | Catches accidental state attachment. Small feature, big UX win. |
| **Context packet assembly** | Instead of dumping all context, assemble a focused packet: shared baseline + workstream state + relevant diffs + current plan | High | This is the secret sauce. Cursor dumps everything. Aider uses repo map. BranchOS curates context per-phase. |
| **Async team coordination without a server** | Git IS the coordination layer. No Slack bot, no web dashboard, no real-time sync needed | Med | Counter-positioning against tools that require infrastructure. Appeals to teams that hate adding services. |
| **Workstream templates** | "Start a bugfix workstream" vs "Start a feature workstream" with different phase structures | Low | Different work types need different workflows. A bugfix doesn't need 5 phases. |
| **Phase-specific context injection** | Discuss phase gets architecture + conventions. Execute phase gets plan + test patterns. Different phases, different context | Med | Most AI tools give the same context regardless of what you're doing. Phase-awareness is novel. |

## Anti-Features

Features to explicitly NOT build. Each represents a deliberate constraint.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Web dashboard** | Scope creep killer. Terminal-first means terminal-only for v1. A dashboard implies a server, auth, deployment -- none of which serve the core value | CLI output with good formatting. `branchos status` should be as readable as any dashboard. |
| **Real-time collaboration** | Implies a server, WebSocket infrastructure, presence tracking. Git-based async coordination is the design choice | File-based state in git. Team syncs via pull/push. Async is a feature, not a limitation. |
| **Autonomous multi-agent swarm** | "AI writes all the code while you sleep" is a different product. BranchOS assists developers, it doesn't replace them | Structured phases where the developer drives. AI provides context and suggestions, developer makes decisions. |
| **Issue tracker integration** | Jira/Linear/GitHub Issues integration is a maintenance nightmare and scope explosion. Every team uses something different | Workstream descriptions are freeform. Developer can paste a ticket link. No API integration. |
| **PR automation** | Auto-creating PRs conflates workflow management with git hosting. Different teams have different PR conventions | Workstream archive captures context that a developer can paste into a PR description manually. |
| **Multi-repo orchestration** | Monorepo-style multi-service coordination is a fundamentally different problem | Single repo focus. If a team uses multiple repos, each gets its own `.branchos/`. |
| **Editor/IDE integration** | Building VSCode extensions, Neovim plugins, etc. fragments the product. Claude Code slash commands are the integration point | Slash commands work in any terminal. Editor-agnostic by design. |
| **Module-level conflict detection** | Inferring that two workstreams touch the same "module" requires understanding code structure deeply -- high complexity, uncertain value | File-level detection is concrete and reliable. "You both touch auth.ts" is actionable. "You both touch the auth module" is fuzzy. |
| **Built-in AI model management** | Choosing models, managing API keys, configuring providers -- Claude Code already does this | Delegate to Claude Code entirely. BranchOS provides context, Claude Code provides AI. |
| **Undo/rollback of workstream state** | Version-controlling the version control adds complexity. Git already provides rollback | State is in git. `git log .branchos/workstreams/<id>/` shows history. Standard git tools work. |

## Feature Dependencies

```
Branch-aware context ──> Workstream isolation (must know which workstream you're in)
Context assembly ──> Codebase mapping (needs shared repo context)
Context assembly ──> Progress tracking (needs to know current phase/state)
Phase-specific context ──> Structured workflow phases (phases must exist first)
Conflict detection ──> Workstream isolation (must track which workstream touches which files)
Conflict detection ──> Progress tracking (needs plan with file lists)
Plan reconciliation ──> Git integration (must read commit history)
Plan reconciliation ──> Structured workflow phases (needs a plan to reconcile against)
Staleness detection ──> Codebase mapping (must have a map to detect staleness of)
Workstream archival ──> Workstream lifecycle (must have lifecycle to archive)
Branch-switch prompt ──> Branch-aware context (must detect branch)
Workstream templates ──> Workstream lifecycle (must have creation flow to template)
```

## Critical Dependency Chain (Build Order)

```
1. Git integration (foundation -- all state stored in git)
   |
2. Workstream isolation + Branch-aware context (core value)
   |
3. Codebase mapping (shared layer)
   |
4. Structured workflow phases + Progress tracking
   |
5. Context assembly for AI (the payoff -- requires 1-4)
   |
6. Conflict detection, Plan reconciliation, Staleness detection (enhancement layer)
```

## MVP Recommendation

**Prioritize (Phase 1 -- make it work for one developer first):**
1. CLI scaffolding + npm installability
2. Workstream creation with branch auto-detection
3. Workstream-scoped state storage (`.branchos/workstreams/<id>/`)
4. Shared repo context storage (`.branchos/shared/`)
5. Basic codebase mapping
6. Single-phase workflow (discuss then plan then execute, linear)

**Prioritize (Phase 2 -- make it work for a team):**
1. Context assembly / slash commands for Claude Code
2. Multi-phase workstreams
3. Workstream status command (team overview)
4. Workstream archival on merge
5. File-level conflict detection

**Prioritize (Phase 3 -- make it delightful):**
1. Staleness detection for codebase map
2. Git-aware plan reconciliation
3. Branch-switch prompt
4. Phase-specific context injection
5. Workstream templates

**Defer indefinitely:**
- All anti-features listed above
- Module-level conflict detection (reassess after v1 usage data)

## Competitor Feature Matrix

| Feature | GSD | Aider | Cursor | Continue | BranchOS (target) |
|---------|-----|-------|--------|----------|-------------------|
| Codebase indexing | Manual map | Repo map (auto) | Full index | Embeddings | Shared map (persistent) |
| Structured workflow | Yes (phases) | No | No | No | Yes (per workstream) |
| Team support | No (shared state breaks) | No | No (per-user) | No (per-user) | Yes (core value) |
| Branch awareness | No | Partial (git integration) | No | No | Yes (auto-detect) |
| Conflict detection | No | No | No | No | Yes (file-level) |
| Context persistence | File-based | Session-based | Session-based | Session-based | Git-committed |
| CLI-first | Yes | Yes | No (IDE) | No (IDE) | Yes |
| Decision capture | Yes (decisions.md) | No | No | No | Yes (per workstream) |
| Progress tracking | Manual | No | No | No | Automatic (state.json) |
| Plan reconciliation | No | No | No | No | Yes (git-diff based) |

## Sources

- Direct knowledge of GSD architecture and implementation (HIGH confidence -- authored/used tool)
- Aider feature set from training data through early 2025 (MEDIUM confidence)
- Cursor and Continue feature sets from training data (MEDIUM confidence)
- Team coordination patterns from developer tooling domain knowledge (HIGH confidence)
- Note: Web verification was unavailable. Competitor features may have evolved since training cutoff.
