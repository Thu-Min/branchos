# Slash Commands

BranchOS provides 14 slash commands for Claude Code that integrate AI-assisted workflows directly into your development environment.

## Installation

Slash commands are installed automatically when you run `branchos init`. To reinstall manually:

```bash
branchos install-commands
```

This installs command files to both `~/.claude/commands/` and `~/.claude/skills/`. Restart Claude Code after installation.

To remove them:

```bash
branchos install-commands --uninstall
```

## Core Workflow Commands

### `/branchos:map-codebase`

Generate or refresh the shared codebase map.

**Usage:**
```
/branchos:map-codebase
```

**What it does:**
1. Reads `.branchos/config.json` for exclude patterns
2. Analyzes the entire codebase using Glob, Read, and Grep
3. Generates 5 map files in `.branchos/shared/codebase/`:
   - `ARCHITECTURE.md` - High-level structure, entry points, data flow
   - `MODULES.md` - Directory-level module descriptions
   - `CONVENTIONS.md` - Code patterns, naming, organization
   - `STACK.md` - Dependencies and their purposes
   - `CONCERNS.md` - Tech debt and complexity observations
4. Each file includes YAML frontmatter with generation timestamp and commit hash
5. Auto-commits all map files

**When to run:**
- After initializing BranchOS
- When `branchos map-status` reports the map is stale
- After significant structural changes to the codebase

---

### `/branchos:context`

Load workstream context for the current phase.

**Usage:**
```
/branchos:context [step]
```

**Arguments:**
- `step` (optional) - Force a specific step: `discuss`, `plan`, or `execute`

**What it does:**
Outputs a structured context packet containing:
- Workstream metadata (ID, branch, phase, step, statuses)
- Relevant codebase map sections
- Branch diff summary
- Current phase artifacts
- Accumulated decisions
- Warnings about stale maps or missing artifacts

**Auto-detection:**
Without a step argument, BranchOS detects the appropriate context:
1. Execute in-progress or complete → execute context
2. Plan complete → execute context
3. Discuss complete → plan context
4. Otherwise → discuss context

**Tip:** Run `/branchos:context` at the start of each Claude Code session to give Claude full awareness of your workstream state.

---

### `/branchos:discuss-phase`

Create or update discussion context for the current phase.

**Usage:**
```
/branchos:discuss-phase [phase-number] [description]
```

**Examples:**
```
/branchos:discuss-phase
/branchos:discuss-phase 2
/branchos:discuss-phase Add JWT authentication to the API
```

**What it does:**
1. Resolves the workstream from the current branch
2. Determines the target phase (auto-detected or specified)
3. Gathers context from codebase map, decisions, and prior phases
4. Generates `discuss.md` with goal, requirements, assumptions, unknowns, and decisions
5. Updates `state.json` to mark discussion as complete
6. Records any decisions in `decisions.md`
7. Auto-commits

---

### `/branchos:plan-phase`

Create an implementation plan for the current phase.

**Usage:**
```
/branchos:plan-phase [phase-number] [additional-direction]
```

**Examples:**
```
/branchos:plan-phase
/branchos:plan-phase 2
/branchos:plan-phase Focus on minimal changes to existing auth module
```

**What it does:**
1. Resolves the workstream and target phase
2. Reads `discuss.md` for context (warns if missing)
3. Analyzes codebase map for architecture and conventions
4. Generates `plan.md` with objective, tasks, affected files, dependencies, and risks
5. Captures `planBaseline` (HEAD commit hash) for drift detection
6. Updates `state.json` and auto-commits

**Important:** The affected files format uses backtick-quoted paths (`- \`path/to/file\``). This format is parsed by drift detection and conflict analysis.

---

### `/branchos:execute-phase`

Track execution progress for the current phase.

**Usage:**
```
/branchos:execute-phase [phase-number]
```

**What it does:**
1. Resolves the workstream and target phase
2. Reads `plan.md` and examines git history since `planBaseline`
3. Compares planned files against actually changed files
4. Assesses each task's completion status
5. Generates/updates `execute.md` with completed, in-progress, remaining tasks, and blockers
6. Updates `state.json` with execution status
7. Auto-commits

**Tip:** Run this command multiple times during implementation to keep the tracking state current.

---

## Workstream Management Commands

### `/branchos:create-workstream`

Create a new workstream for the current branch.

**Usage:**
```
/branchos:create-workstream [--name <id>] [--feature <id>] [--issue #N]
```

Auto-derives the workstream ID from the branch name by stripping prefixes (`feature/`, `fix/`, etc.) and slugifying.

---

### `/branchos:list-workstreams`

List all workstreams and their status.

---

### `/branchos:status`

Show a consolidated dashboard with workstream status, map freshness, drift, and conflicts.

---

### `/branchos:archive`

Archive a completed workstream after its branch has been merged.

---

## Project Planning Commands

### `/branchos:ingest-prfaq`

Ingest an Amazon-style PR-FAQ document for project planning. Parses the document and stores structured data for roadmap generation.

---

### `/branchos:plan-roadmap`

Generate a roadmap with milestones and features from an ingested PR-FAQ. Creates feature definitions with acceptance criteria.

---

### `/branchos:refresh-roadmap`

Refresh the roadmap and feature registry when the PR-FAQ has been updated.

---

### `/branchos:features`

List features from the feature registry or view details for a specific feature.

---

### `/branchos:sync-issues`

Push feature definitions to GitHub Issues for team coordination and assignment.

---

## Workflow Example

A typical session using slash commands:

```
# Start of session - load context
/branchos:context

# Phase 1: Define the work
/branchos:discuss-phase Implement rate limiting for API endpoints

# Phase 1: Create the plan
/branchos:plan-phase

# ... implement the changes ...

# Phase 1: Track progress
/branchos:execute-phase

# Phase 2: Next unit of work
/branchos:discuss-phase 2 Add rate limit configuration UI
/branchos:plan-phase 2

# ... implement more changes ...

/branchos:execute-phase 2
```
