# Getting Started

This guide walks you through setting up BranchOS in your project from scratch.

## Prerequisites

- **Node.js** >= 20
- A **Git repository** (BranchOS relies on Git for state tracking)
- **Claude Code** (for AI-assisted slash commands)

## Installation

Install BranchOS globally via npm:

```bash
npm install -g branchos
```

Or use it directly with npx:

```bash
npx branchos --help
```

## Step 1: Initialize BranchOS

Navigate to your Git repository and run:

```bash
branchos init
```

This creates the `.branchos/` directory structure:

```
.branchos/
├── config.json              # Repository-level configuration
├── shared/
│   └── codebase/            # Shared codebase map (generated later)
└── workstreams/             # Per-branch workstream state
```

It also adds `.branchos-runtime/` to your `.gitignore` and auto-commits the initialization.

## Step 2: Install Claude Code Slash Commands

```bash
branchos install-commands
```

This installs 5 slash commands into `~/.claude/commands/` for use in Claude Code:

- `/branchos:map-codebase` - Generate codebase map
- `/branchos:context` - Load workstream context
- `/branchos:discuss-phase` - Create discussion context
- `/branchos:plan-phase` - Create implementation plan
- `/branchos:execute-phase` - Track execution progress

Restart Claude Code after installing commands.

## Step 3: Generate the Codebase Map

In Claude Code, run:

```
/branchos:map-codebase
```

This analyzes your repository and generates 5 shared knowledge files in `.branchos/shared/codebase/`:

| File | Content |
|------|---------|
| `ARCHITECTURE.md` | High-level structure, entry points, data flow |
| `MODULES.md` | Directory-level module descriptions |
| `CONVENTIONS.md` | Code patterns, naming, organization |
| `STACK.md` | Dependencies and their purposes |
| `CONCERNS.md` | Tech debt and complexity observations |

These files are shared across all workstreams and provide Claude with deep repository understanding.

## Step 4: Create a Feature Branch and Workstream

```bash
# Create and switch to a feature branch
git checkout -b feature/add-auth

# Create a BranchOS workstream for this branch
branchos workstream create
```

BranchOS automatically derives a workstream ID from the branch name. `feature/add-auth` becomes `add-auth`.

You can also specify a custom name:

```bash
branchos workstream create --name auth-system
```

## Step 5: Run the Phase Workflow

BranchOS uses a three-phase cycle for each unit of work:

### 1. Discuss

In Claude Code, run:

```
/branchos:discuss-phase
```

This creates a `discuss.md` capturing the goal, requirements, assumptions, unknowns, and decisions for the current phase.

### 2. Plan

```
/branchos:plan-phase
```

This reads the discussion context and generates a `plan.md` with tasks, affected files, dependencies, and risks.

### 3. Execute

After implementing the planned changes, run:

```
/branchos:execute-phase
```

This compares the plan against actual git changes and generates an `execute.md` tracking completed, in-progress, and remaining tasks.

## Step 6: Monitor Progress

```bash
# View all workstreams
branchos status

# Check if codebase map needs refreshing
branchos map-status

# Compare planned vs actual changes
branchos check-drift

# Detect file conflicts between workstreams
branchos detect-conflicts
```

## Next Steps

- Read the [CLI Reference](./cli-reference.md) for all available commands
- Learn about the [Phase Workflow](./phase-workflow.md) in detail
- Understand [Conflict Detection](./conflict-detection.md)
- See [Configuration](./configuration.md) options
