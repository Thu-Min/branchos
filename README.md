# BranchOS

Branch-based AI-assisted development workflow management for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## The Problem

When multiple developers use AI-assisted tools (like Claude Code) in the same repository, their planning and execution state collides. AI-generated plans, decisions, and progress tracking get overwritten, become outdated, or conflict with each other.

## The Solution

BranchOS isolates planning and execution state **per Git branch** while maintaining a shared understanding of the codebase. Each developer gets their own workstream with independent phases, plans, and progress tracking — without corrupting anyone else's state.

**v2** adds a **project-level planning layer**: ingest an Amazon-style PR-FAQ, generate a roadmap with milestones and features, sync to GitHub Issues, and create feature-aware workstreams — all through Claude Code slash commands.

**v2.2** closes the developer loop with **PR workflow automation**: structured Given/When/Then acceptance criteria, automatic developer identity capture, issue-linked workstream creation, and one-command PR generation with full context.

## Installation

```bash
npm install -g branchos
```

## Quick Start

### 1. Initialize BranchOS in your repo

```bash
branchos init
```

Creates the `.branchos/` directory structure, auto-commits, and installs all slash commands into Claude Code.

### 2. Generate the codebase map

In Claude Code, run:

```
/branchos:map-codebase
```

This analyzes your repository and generates shared knowledge files (architecture, modules, conventions, stack, concerns) that all workstreams can reference.

### 3. (Optional) Set up project-level planning

```
# Ingest a PR-FAQ document
/branchos:ingest-prfaq

# Generate roadmap with milestones and features
/branchos:plan-roadmap

# Sync features to GitHub Issues
/branchos:sync-issues
```

### 4. Create a feature branch and workstream

```bash
git checkout -b feature/add-auth
```

In Claude Code:

```
/branchos:create-workstream
```

BranchOS auto-derives the workstream ID from the branch name (`feature/add-auth` → `add-auth`). You can link to a feature with `--feature <id>` or a GitHub Issue with `--issue #N` (auto-matches the issue to a feature).

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

```
# View all workstreams and their status
/branchos:status

# List all workstreams
/branchos:list-workstreams

# View features from the feature registry
/branchos:features

# Archive a completed workstream
/branchos:archive
```

From the terminal:

```bash
# Check if codebase map needs refreshing
branchos map-status

# Compare planned vs actual file changes
branchos check-drift

# Detect file conflicts between active workstreams
branchos detect-conflicts
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `branchos init` | Initialize BranchOS and install slash commands |
| `branchos install-commands [--uninstall]` | Install/remove Claude Code slash commands |
| `branchos status [--all]` | Show all workstreams and their state |
| `branchos map-status` | Check codebase map freshness |
| `branchos check-drift [--phase N]` | Compare planned vs actual changes |
| `branchos detect-conflicts [--all]` | Find file conflicts between workstreams |

## Claude Code Slash Commands

### Project Planning Flow

| Command | Description |
|---------|-------------|
| `/branchos:discuss-project` | Create a PR-FAQ document through guided interactive discussion |
| `/branchos:ingest-prfaq` | Ingest PR-FAQ document for project planning |
| `/branchos:plan-roadmap` | Generate roadmap and feature files from ingested PR-FAQ |
| `/branchos:refresh-roadmap` | Refresh roadmap and features when the PR-FAQ has been updated |
| `/branchos:features` | List features or view feature details from the feature registry |
| `/branchos:sync-issues` | Push feature definitions to GitHub Issues for team coordination |

### Workstream Management

| Command | Description |
|---------|-------------|
| `/branchos:create-workstream` | Create a new BranchOS workstream |
| `/branchos:list-workstreams` | List all workstreams with status |
| `/branchos:archive` | Archive a completed workstream after branch merge |

### Phase Workflow

| Command | Description |
|---------|-------------|
| `/branchos:context` | Load workstream context for current phase |
| `/branchos:discuss-phase` | Create or update discussion context for current workstream phase |
| `/branchos:plan-phase` | Create implementation plan for current workstream phase |
| `/branchos:execute-phase` | Update execution state for current workstream phase |

### PR Workflow

| Command | Description |
|---------|-------------|
| `/branchos:create-pr` | Create a GitHub PR from workstream context with acceptance criteria |

### Codebase & Status

| Command | Description |
|---------|-------------|
| `/branchos:map-codebase` | Generate or refresh the codebase map in `.branchos/shared/codebase/` |
| `/branchos:status` | Show BranchOS dashboard with workstream status, map staleness, drift, and conflicts |
| `/branchos:research` | Start an interactive research session or save findings |

## Documentation

- [Getting Started](docs/getting-started.md) - Full setup walkthrough
- [CLI Reference](docs/cli-reference.md) - All terminal commands in detail
- [Phase Workflow](docs/phase-workflow.md) - The Discuss → Plan → Execute cycle
- [Slash Commands](docs/slash-commands.md) - Claude Code integration
- [PR Workflow](docs/pr-workflow.md) - Issue linking, acceptance criteria, and PR creation
- [Conflict Detection](docs/conflict-detection.md) - Cross-workstream conflict analysis
- [Configuration](docs/configuration.md) - Config options and directory structure

## Requirements

- Node.js >= 20
- Git repository
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for slash commands)

## License

MIT
