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

It also adds `.branchos-runtime/` to your `.gitignore`, auto-commits the initialization, and installs all 16 slash commands into Claude Code.

## Step 2: Generate the Codebase Map

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

## Step 3: (Optional) Set Up Project-Level Planning

If you have an Amazon-style PR-FAQ document, you can use it to drive planning:

```
# Ingest your PR-FAQ
/branchos:ingest-prfaq

# Generate roadmap with milestones and features
/branchos:plan-roadmap

# View the feature registry
/branchos:features

# Sync features to GitHub Issues for team assignment
/branchos:sync-issues
```

## Step 4: Create a Feature Branch and Workstream

```bash
# Create and switch to a feature branch
git checkout -b feature/add-auth
```

In Claude Code:

```
/branchos:create-workstream
```

BranchOS automatically derives a workstream ID from the branch name. `feature/add-auth` becomes `add-auth`.

You can also specify a custom name or link to a feature:

```
/branchos:create-workstream --name auth-system
/branchos:create-workstream --feature FEAT-01
/branchos:create-workstream --issue #42
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

```
# View all workstreams and their status
/branchos:status

# List all workstreams
/branchos:list-workstreams
```

From the terminal:

```bash
# Check if codebase map needs refreshing
branchos map-status

# Compare planned vs actual changes
branchos check-drift

# Detect file conflicts between workstreams
branchos detect-conflicts
```

## Step 7: Create a PR

When your work is done, generate a PR with full context:

```
/branchos:create-pr
```

This assembles a PR body from your workstream context — including feature description, GWT-formatted acceptance criteria, and phase summaries — assigns you as the author, and creates the PR via `gh`.

## Next Steps

- Read the [CLI Reference](./cli-reference.md) for all available commands
- Learn about the [Phase Workflow](./phase-workflow.md) in detail
- Understand the [PR Workflow](./pr-workflow.md) — issue linking, acceptance criteria, and PR creation
- Understand [Conflict Detection](./conflict-detection.md)
- See [Configuration](./configuration.md) options
