---
id: R-001
topic: Git Worktrees for Parallel AI Agents in BranchOS
status: complete
date: 2026-03-15
features: []
---

## Summary

- Git worktrees are the industry-standard approach for running multiple AI coding agents in parallel, adopted by Claude Code, Cursor, GitHub Copilot, and tools like CCManager and git-worktree-runner
- BranchOS will adopt a **branch-per-worktree** state model where each worktree has its own `.branchos/` state, with git merge handling synchronization — no external shared state needed
- **v2.3** delivers worktree lifecycle management (`worktree add/list/remove`, `create-workstream --worktree`, archive-driven cleanup with sibling directory convention)
- **v2.4** delivers agent dispatch (`branchos dispatch --features F-001,F-002` spawning Claude Code sessions in tmux, full workflow autonomy, dispatch manifests and status monitoring)
- Key architectural insight: feature files are already per-file (`F-001.md`, `F-002.md`), so one-feature-per-agent dispatch avoids merge conflicts naturally

## Findings

### 1. Industry Landscape

Git worktrees have become the de facto standard for parallel AI agent development:

- **Claude Code**: Built-in `--worktree` flag, `isolation: "worktree"` for sub-agents, `--tmux` for persistent sessions
- **GitHub Copilot CLI**: Automatically creates worktrees for background agent sessions in VS Code
- **Cursor**: Spins up worktrees when running multiple models on the same prompt
- **CCManager**: CLI managing sessions across Claude Code, Gemini CLI, Codex CLI, Cursor Agent, Copilot CLI, Cline CLI, OpenCode, Kimi CLI — all via worktrees
- **git-worktree-runner (CodeRabbit)**: Bash-based worktree manager with config copying, dependency installation, editor/AI tool integration
- **ccswarm**: Orchestrates specialized agent pools (Frontend, Backend, DevOps, QA) in worktree-isolated environments

### 2. How Git Worktrees Work

- `git worktree add <path> <branch>` creates a new working directory sharing the same `.git` object database
- **Shared**: commit history, refs, object database, git config, hooks
- **Isolated**: working directory files, staging area (index), HEAD, checked-out branch
- Lightweight — no repo duplication (node_modules, etc. are separate but .git objects are shared)
- Each worktree directory contains a `.git` file (not directory) pointing back to main repo's `.git/worktrees/<name>`

### 3. State Model Decision: Branch-Per-Worktree

**Decision:** Each worktree = its own branch = its own `.branchos/` state copy.

**Why this works for BranchOS:**
- Feature files are already one-per-file (`F-001.md`, `F-002.md`) — parallel agents editing different features don't create merge conflicts
- Workstream state is already isolated under `.branchos/workstreams/<id>/`
- Roadmap is read-only during execution — agents don't modify `ROADMAP.md`
- The only conflict risk is two agents touching the *same* feature file (prevented by one-feature-per-agent dispatch)

**Conflict resolution:** Last-merged wins (standard git merge). Conflicts should be rare with proper dispatch. Manual resolution when they occur.

### 4. Worktree Lifecycle (v2.3)

**Commands:**
- `branchos worktree add <name>` — create a worktree in sibling directory (e.g., `../repo-feature-x/`)
- `branchos worktree list` — show all active worktrees with their workstream mappings
- `branchos worktree remove <name>` — clean up a worktree directory

**Integration with existing commands:**
- `branchos create-workstream --worktree` — creates worktree + branch + workstream state in one command
- `branchos archive` — extended to remove the associated worktree on completion

**Directory convention:** Sibling directories (`../repo-<branch-name>/`), following the git worktree community convention.

### 5. Agent Dispatch (v2.4)

**Command:**
```
branchos dispatch --features F-001,F-002,F-003
```

**Flow:**
1. Read feature registry to get target features
2. For each feature: create worktree + workstream (if not exists)
3. Spawn headless Claude Code session in each worktree via tmux
4. Each agent runs full BranchOS workflow: discuss → plan → execute
5. Track sessions in dispatch manifest (`.branchos/shared/dispatch.json`)

**Agent spawning:**
```bash
claude -p "/branchos:context discuss && /branchos:discuss-phase && /branchos:plan-phase && /branchos:execute-phase" \
  --worktree feature/F-001-title \
  --tmux \
  --output-format stream-json
```

**Monitoring:**
- `branchos dispatch status` — shows all active tmux sessions, their feature, and progress
- Users can attach to any tmux session to observe/intervene
- Session IDs stored in dispatch manifest for `--resume` capability

**Tmux sessions:** Named windows (e.g., `branchos-F-001`) that are attachable and observable. User can `tmux attach -t branchos-F-001` to watch or intervene.

### 6. Challenges and Mitigations

| Challenge | Mitigation |
|-----------|------------|
| Shared database/Docker state | Document as constraint — agents should not share stateful resources |
| `.branchos/shared/` divergence | One-feature-per-agent prevents conflicts; git merge handles edge cases |
| Disk space for worktrees | Worktrees share `.git` objects; only working files are duplicated |
| Claude Code `/ide` not recognizing worktrees | Known issue — BranchOS operates via CLI, not IDE integration |
| Agent failures mid-run | Tmux sessions persist; `--resume` with session ID to continue |

### 7. Milestone Breakdown

**v2.3 — Worktree Lifecycle**
- `branchos worktree add/list/remove` commands
- `create-workstream --worktree` flag
- Sibling directory convention
- `branchos archive` extended for worktree cleanup
- Branch-per-worktree state model

**v2.4 — Agent Dispatch**
- `branchos dispatch --features F-001,F-002,F-003`
- Tmux-based agent sessions
- Full workflow autonomy (discuss → plan → execute)
- Dispatch manifest and status monitoring
- `branchos dispatch status` command

### 8. Sources

- [Git Worktrees for Multi-Feature Development with AI Agents](https://www.nrmitchi.com/2025/10/using-git-worktrees-for-multi-feature-development-with-ai-agents/)
- [Git Worktrees: The Secret Weapon for Running Multiple AI Coding Agents in Parallel](https://medium.com/@mabd.dev/git-worktrees-the-secret-weapon-for-running-multiple-ai-coding-agents-in-parallel-e9046451eb96)
- [How Git Worktrees Changed My AI Agent Workflow (Nx Blog)](https://nx.dev/blog/git-worktrees-ai-agents)
- [Parallel AI Coding with Git Worktrees and Custom Claude Code Commands](https://docs.agentinterviews.com/blog/parallel-ai-coding-with-gitworktrees/)
- [CodeRabbit git-worktree-runner](https://github.com/coderabbitai/git-worktree-runner)
- [agent-worktree](https://github.com/nekocode/agent-worktree)
- [Parallel Worktrees Skill for Claude Code](https://github.com/spillwavesolutions/parallel-worktrees)
- [incident.io: Shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)
- [Claude Code Headless Mode Docs](https://code.claude.com/docs/en/headless)
- [Claude Code Common Workflows (Worktrees)](https://code.claude.com/docs/en/common-workflows)
- [CCManager — Multi-Agent Session Manager](https://github.com/kbwo/ccmanager)
- [How We Built True Parallel Agents With Git Worktrees](https://dev.to/getpochi/how-we-built-true-parallel-agents-with-git-worktrees-2580)
