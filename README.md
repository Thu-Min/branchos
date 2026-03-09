# BranchOS

Branch-based AI-assisted development workflow management.

## The Problem

When multiple developers use AI-assisted tools (like Claude Code) in the same repository, their planning and execution state collides. AI-generated plans, decisions, and progress tracking get overwritten, become outdated, or conflict with each other. Each developer's AI loses track of what has been done and what remains for their specific work.

## The Solution

BranchOS isolates planning and execution state **per Git branch** while maintaining a shared understanding of the codebase. Each developer gets their own workstream with independent phases, plans, and progress tracking — without corrupting anyone else's state.

**Shared knowledge** (codebase architecture, conventions, tech stack) lives in one place for all workstreams. **Isolated state** (discussion context, implementation plans, execution tracking, decisions) lives per workstream. BranchOS also detects file-level conflicts between workstreams before they become merge problems.

## Installation

```bash
npm install -g branchos
```

## Quick Start

### 1. Initialize BranchOS in your repo

```bash
branchos init
```

Creates the `.branchos/` directory structure and auto-commits.

### 2. Install Claude Code slash commands

```bash
branchos install-commands
```

Installs 5 slash commands (`/branchos:map-codebase`, `/branchos:context`, `/branchos:discuss-phase`, `/branchos:plan-phase`, `/branchos:execute-phase`) into Claude Code. Restart Claude Code after installing.

### 3. Generate the codebase map

In Claude Code, run:

```
/branchos:map-codebase
```

This analyzes your repository and generates shared knowledge files (architecture, modules, conventions, stack, concerns) that all workstreams can reference.

### 4. Create a feature branch and workstream

```bash
git checkout -b feature/add-auth
branchos workstream create
```

BranchOS auto-derives the workstream ID from the branch name (`feature/add-auth` → `add-auth`).

### 5. Run the three-phase workflow

Each phase follows a **Discuss → Plan → Execute** cycle:

```
# In Claude Code:

# Step 1: Define the work
/branchos:discuss-phase Add JWT authentication to the API

# Step 2: Create the implementation plan
/branchos:plan-phase

# Step 3: (implement your changes, then) Track progress
/branchos:execute-phase
```

### 6. Monitor and manage

```bash
# View all workstreams and their status
branchos status

# Check if codebase map needs refreshing
branchos map-status

# Compare planned vs actual file changes
branchos check-drift

# Detect file conflicts between active workstreams
branchos detect-conflicts

# Archive a completed workstream
branchos archive <workstream-id>
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `branchos init` | Initialize BranchOS in a Git repository |
| `branchos workstream create [--name]` | Create a workstream for the current branch |
| `branchos status [--all]` | Show all workstreams and their state |
| `branchos discuss [phase]` | Create discussion context for a phase |
| `branchos plan [phase]` | Create implementation plan for a phase |
| `branchos execute [phase]` | Track execution progress for a phase |
| `branchos context [step]` | Assemble context packet for Claude Code |
| `branchos check-drift [--phase N]` | Compare planned vs actual changes |
| `branchos detect-conflicts [--all]` | Find file conflicts between workstreams |
| `branchos map-status` | Check codebase map freshness |
| `branchos archive <id> [--force]` | Archive a completed workstream |
| `branchos unarchive <id>` | Restore an archived workstream |
| `branchos install-commands [--uninstall]` | Install/remove Claude Code slash commands |

## Claude Code Slash Commands

| Command | Description |
|---------|-------------|
| `/branchos:map-codebase` | Generate or refresh the shared codebase map |
| `/branchos:context [step]` | Load workstream context for the current phase |
| `/branchos:discuss-phase [N]` | Create discussion context for a phase |
| `/branchos:plan-phase [N]` | Create implementation plan for a phase |
| `/branchos:execute-phase [N]` | Track execution progress for a phase |

## Documentation

- [Getting Started](docs/getting-started.md) - Full setup walkthrough
- [CLI Reference](docs/cli-reference.md) - All terminal commands in detail
- [Phase Workflow](docs/phase-workflow.md) - The Discuss → Plan → Execute cycle
- [Slash Commands](docs/slash-commands.md) - Claude Code integration
- [Conflict Detection](docs/conflict-detection.md) - Cross-workstream conflict analysis
- [Configuration](docs/configuration.md) - Config options and directory structure

## Requirements

- Node.js >= 20
- Git repository
- Claude Code (for slash commands)

## License

MIT
