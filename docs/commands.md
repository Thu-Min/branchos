# BranchOS Commands — Detailed Reference

This document covers every BranchOS command in detail: what it does, when to use it, its options, inputs, outputs, and how it connects to the rest of the workflow.

---

## Table of Contents

- [Workflow Overview](#workflow-overview)
- [Bootstrapping Commands](#bootstrapping-commands)
  - [`branchos init`](#branchos-init)
  - [`branchos install-commands`](#branchos-install-commands)
- [Codebase Intelligence](#codebase-intelligence)
  - [`/branchos:map-codebase`](#branchosmap-codebase)
  - [`branchos map-status`](#branchos-map-status)
- [Project Planning Commands](#project-planning-commands)
  - [`/branchos:discuss-project`](#branchosdiscuss-project)
  - [`/branchos:ingest-prfaq`](#branchosingest-prfaq)
  - [`/branchos:plan-roadmap`](#branchosplan-roadmap)
  - [`/branchos:refresh-roadmap`](#branchosrefresh-roadmap)
  - [`/branchos:features`](#branchosfeatures)
  - [`/branchos:sync-issues`](#branchossync-issues)
- [Workstream Lifecycle Commands](#workstream-lifecycle-commands)
  - [`/branchos:create-workstream`](#branchoscreate-workstream)
  - [`/branchos:list-workstreams`](#branchoslist-workstreams)
  - [`/branchos:status`](#branchosstatus)
  - [`/branchos:archive`](#branchosarchive)
- [Phase Workflow Commands](#phase-workflow-commands)
  - [`/branchos:context`](#branchoscontext)
  - [`/branchos:discuss-phase`](#branchosdiscuss-phase)
  - [`/branchos:plan-phase`](#branchosplan-phase)
  - [`/branchos:execute-phase`](#branchosexecute-phase)
- [PR & Collaboration Commands](#pr--collaboration-commands)
  - [`/branchos:create-pr`](#branchoscreate-pr)
  - [`/branchos:research`](#branchosresearch)
- [Monitoring Commands](#monitoring-commands)
  - [`branchos check-drift`](#branchos-check-drift)
  - [`branchos detect-conflicts`](#branchos-detect-conflicts)

---

## Workflow Overview

BranchOS commands follow a three-stage lifecycle:

```
PROJECT SETUP               PROJECT PLANNING              PER-FEATURE DEVELOPMENT
─────────────               ────────────────              ───────────────────────
init                        discuss-project               create-workstream
map-codebase                ingest-prfaq                  discuss-phase → plan-phase → execute-phase
                            plan-roadmap                  create-pr
                            sync-issues                   archive
```

Each stage builds on the previous. Project setup is done once, project planning once per product cycle, and per-feature development repeats for every feature branch.

---

## Bootstrapping Commands

### `branchos init`

**What it does:** Initializes BranchOS in your Git repository. This is the first command you run — it creates the entire directory structure that BranchOS needs and installs all slash commands into Claude Code.

**Usage:**
```bash
branchos init
```

**Actions performed:**
1. Creates the `.branchos/` directory with subdirectories:
   - `shared/codebase/` — for the AI-generated codebase map
   - `shared/features/` — for the feature registry
   - `shared/research/` — for research artifacts
   - `workstreams/` — for per-branch workstream state
2. Creates `config.json` with default schema version
3. Adds `.branchos-runtime/` to `.gitignore` (runtime cache/temp data that should not be committed)
4. Auto-commits the initialization to git
5. Calls `install-commands` to set up all 16 slash commands in Claude Code

**Output files:**
```
.branchos/
├── config.json
├── shared/
│   ├── codebase/
│   ├── features/
│   └── research/
└── workstreams/
```

**Errors:**
- Fails if the current directory is not a Git repository

**When to use:** Once, at the start of a project. If you clone a repo that already has `.branchos/`, you only need to run `branchos install-commands` to set up your local slash commands.

---

### `branchos install-commands`

**What it does:** Installs (or removes) BranchOS slash command files into Claude Code's command directories. These are the markdown files that enable `/branchos:*` commands inside Claude Code.

**Usage:**
```bash
branchos install-commands            # install
branchos install-commands --uninstall # remove
```

**Options:**

| Flag | Description |
|------|-------------|
| `--uninstall` | Remove all previously installed BranchOS slash commands |

**Actions performed:**
1. Writes 16 `branchos:*.md` command files to `~/.claude/commands/`
2. Also writes them to `~/.claude/skills/` for skill-based invocation
3. Command files are bundled into the CLI at build time, so they always match the installed BranchOS version

**When to use:**
- After cloning a repo that already has `.branchos/` (init was already run)
- After upgrading BranchOS to get updated command definitions
- With `--uninstall` when removing BranchOS from your workflow

**Note:** Restart Claude Code after running this command for the changes to take effect. You do not normally need to run this manually — `branchos init` calls it automatically.

---

## Codebase Intelligence

### `/branchos:map-codebase`

**What it does:** Generates a comprehensive, AI-readable map of your entire codebase. This map is the foundation of BranchOS's context system — it gives Claude deep understanding of your project's architecture, patterns, and dependencies so that all subsequent planning and execution is well-informed.

**Usage (Claude Code):**
```
/branchos:map-codebase
```

**Actions performed:**
1. Reads `.branchos/config.json` for exclude patterns (e.g., `node_modules`, `dist`, `*.lock`)
2. Claude systematically analyzes your entire repository using file reads, glob patterns, and content searches
3. Generates 5 structured knowledge files in `.branchos/shared/codebase/`:

| File | What it captures |
|------|-----------------|
| `ARCHITECTURE.md` | High-level structure, entry points, data flow, module boundaries, API surface |
| `MODULES.md` | Directory-level summaries — what each directory contains, key exports, relationships between modules |
| `CONVENTIONS.md` | Code patterns, naming conventions, file organization, state management approaches, error handling patterns |
| `STACK.md` | All dependencies (from `package.json`, `go.mod`, etc.) with descriptions of what each is used for |
| `CONCERNS.md` | Tech debt observations, complexity hotspots, areas that may need attention (descriptive, not prescriptive) |

4. Each file includes YAML frontmatter with:
   - Generation timestamp
   - Commit hash at time of generation
   - Generator identifier
5. Auto-commits all map files to git

**Output files:**
```
.branchos/shared/codebase/
├── ARCHITECTURE.md
├── MODULES.md
├── CONVENTIONS.md
├── STACK.md
└── CONCERNS.md
```

**When to use:**
- After `branchos init` (the very first time)
- When `branchos map-status` reports the map is stale
- After significant structural changes (new modules, major refactors, dependency changes)

**How other commands use it:**
- `/branchos:discuss-phase` reads ARCHITECTURE and CONVENTIONS for context
- `/branchos:plan-phase` reads MODULES and CONVENTIONS to understand code layout
- `/branchos:context` includes relevant map sections in context packets
- `/branchos:detect-conflicts` uses the map for architectural awareness

---

### `branchos map-status`

**What it does:** Reports how fresh or stale the codebase map is. It compares the commit hash stored in each map file's frontmatter against the current HEAD to tell you how many commits behind the map is.

**Usage:**
```bash
branchos map-status [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Output:**
- For each map file: when it was generated, at which commit, and how many commits behind HEAD
- A warning if any file exceeds the staleness threshold (default: 20 commits, configurable in `config.json`)

**When to use:** Before starting a new phase or workstream, to check whether the map needs refreshing. Also useful as a quick health check.

---

## Project Planning Commands

### `/branchos:discuss-project`

**What it does:** Starts a guided, interactive discussion session where Claude helps you write an Amazon-style **PR-FAQ** (Press Release + Frequently Asked Questions). This is a product definition technique that forces clarity on what you're building and why before writing any code.

**Usage (Claude Code):**
```
/branchos:discuss-project
```

**How it works:**
1. Claude asks a series of structured questions about your product/feature:
   - What problem are you solving?
   - Who is the target user?
   - What does the ideal solution look like?
   - What are the key risks and unknowns?
2. Through iterative discussion, Claude drafts the PR-FAQ document
3. The final output is saved to `.branchos/shared/PR-FAQ.md`

**The PR-FAQ format includes:**
- **Press Release** — written as if the product is already launched:
  - Headline and subheadline
  - Problem statement
  - Solution description
  - Customer quote
  - How it works
  - Internal quote
  - Call to action
- **FAQ — External** — questions a customer would ask
- **FAQ — Internal** — questions stakeholders, engineers, and leadership would ask

**Output file:** `.branchos/shared/PR-FAQ.md`

**When to use:** At the start of a new product or major feature initiative, before creating a roadmap. If you already have a PR-FAQ document written elsewhere, use `/branchos:ingest-prfaq` instead.

**Tools available to Claude during this command:** Read, Glob, Grep, Write, Git, WebSearch, WebFetch, AskUserQuestion

---

### `/branchos:ingest-prfaq`

**What it does:** Ingests an existing PR-FAQ document into BranchOS. If you already have a PR-FAQ written (either from `/branchos:discuss-project` or manually), this command validates and registers it so the roadmap planner can consume it.

**Usage (Claude Code):**
```
/branchos:ingest-prfaq [--force] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--force` | Re-ingest even if the PR-FAQ hasn't changed since last ingestion |
| `--json` | Output result as JSON |

**Actions performed:**
1. Reads `.branchos/shared/PR-FAQ.md`
2. Validates the document structure (checks for required sections)
3. Computes a content hash to detect changes
4. Stores ingestion metadata for change detection

**Input file:** `.branchos/shared/PR-FAQ.md`

**When to use:** After writing or updating your PR-FAQ, before running `plan-roadmap`. If using `discuss-project`, the PR-FAQ is already in the right location, so you just need to ingest it.

---

### `/branchos:plan-roadmap`

**What it does:** Reads the ingested PR-FAQ and generates a complete project roadmap with milestones and feature definitions. This is the bridge between product vision (PR-FAQ) and engineering execution (features → workstreams).

**Usage (Claude Code):**
```
/branchos:plan-roadmap [--force]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--force` | Regenerate even if the roadmap already exists |

**Actions performed:**
1. Reads the PR-FAQ from `.branchos/shared/PR-FAQ.md`
2. Claude analyzes the product requirements and breaks them into milestones
3. For each milestone, identifies discrete features that can be independently developed
4. Generates two types of output:

**ROADMAP.md** — contains:
- Milestone definitions (M1, M2, etc.) with themes and goals
- Ordered feature list per milestone with dependencies
- Delivery sequence recommendations
- Completion tracking markers

**Feature files** (one per feature) — each contains:
```yaml
---
id: F-001
title: Feature Title
status: unassigned
milestone: M1
branch: feature/slug-name
issue: null
workstream: null
---
```
Plus:
- Feature description (1-2 sentences)
- Acceptance criteria in Given/When/Then format (multiple ACs per feature)
- Dependencies on other features (if any)

**Output files:**
```
.branchos/shared/
├── ROADMAP.md
└── features/
    ├── F-001-feature-name.md
    ├── F-002-another-feature.md
    └── ...
```

**When to use:** After ingesting the PR-FAQ. Run once to generate the initial roadmap; use `refresh-roadmap` for updates.

---

### `/branchos:refresh-roadmap`

**What it does:** Regenerates the roadmap and feature registry when the PR-FAQ has been updated. Unlike `plan-roadmap`, this command is designed for incremental updates — it preserves existing feature IDs, statuses, and issue links where possible.

**Usage (Claude Code):**
```
/branchos:refresh-roadmap [--force] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--force` | Force refresh even if the PR-FAQ hash hasn't changed |
| `--json` | Output result as JSON |

**Actions performed:**
1. Detects changes in the PR-FAQ since the last roadmap generation
2. Re-reads the PR-FAQ and regenerates the roadmap
3. Preserves existing feature metadata (status, issue number, workstream links)
4. Adds new features, updates changed ones, marks removed ones

**When to use:** After making significant changes to the PR-FAQ. For the initial roadmap, use `plan-roadmap` instead.

---

### `/branchos:features`

**What it does:** Lists all features in the feature registry, or shows detailed information about a specific feature. This is your window into what needs to be built, who is working on what, and current progress.

**Usage (Claude Code):**
```
/branchos:features                          # list all features
/branchos:features F-001                    # view details for feature F-001
/branchos:features --status in-progress     # filter by status
/branchos:features --milestone M1           # filter by milestone
/branchos:features --json                   # output as JSON
```

**Options:**

| Flag | Description |
|------|-------------|
| `<feature-id>` | View detailed info for a specific feature |
| `--status <s>` | Filter by status: `unassigned`, `assigned`, `in-progress`, `complete`, `dropped` |
| `--milestone <m>` | Filter by milestone (e.g., `M1`) |
| `--json` | Output result as JSON |

**List view shows:**
- Feature ID and title
- Status
- Milestone
- Linked issue number (if synced to GitHub)
- Linked workstream (if someone is working on it)

**Detail view shows:**
- All metadata (ID, title, status, milestone, branch, issue, workstream)
- Full feature description
- All acceptance criteria in Given/When/Then format

**When to use:** To see what features exist, check progress, or look up acceptance criteria before starting work.

---

### `/branchos:sync-issues`

**What it does:** Pushes feature definitions from the BranchOS feature registry to GitHub Issues. This creates a bidirectional link: features in BranchOS map to issues on GitHub, enabling team assignment and tracking through GitHub's native interface.

**Usage (Claude Code):**
```
/branchos:sync-issues [--dry-run] [--force] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be created/updated without making changes |
| `--force` | Force sync even if issues appear up-to-date |
| `--json` | Output result as JSON |

**Actions performed:**
1. Reads all feature files from `.branchos/shared/features/`
2. For each feature without an issue number:
   - Creates a new GitHub Issue with the feature title, description, and acceptance criteria
   - Creates milestone labels if they don't exist
   - Stores the issue number back in the feature file's frontmatter
3. For features with existing issues:
   - Updates the issue body if the feature description has changed
   - Syncs status labels
4. Propagates workstream assignees to their linked issues (calls `gh issue edit --add-assignee`)
5. Auto-commits updated feature files (with new issue numbers)

**Requirements:**
- GitHub CLI (`gh`) must be installed and authenticated
- Repository must be hosted on GitHub

**When to use:** After `plan-roadmap` to create initial issues, or periodically to sync status changes. Team members can then self-assign issues on GitHub.

---

## Workstream Lifecycle Commands

### `/branchos:create-workstream`

**What it does:** Creates an isolated workstream for the current Git branch. A workstream is BranchOS's core unit of work — it provides a sandboxed directory where all planning, discussion, and execution state for your current task is stored without interfering with other developers.

**Usage (Claude Code):**
```
/branchos:create-workstream [--name <name>] [--feature <id>] [--issue #N] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--name <name>` | Override auto-derived workstream ID |
| `--feature <id>` | Link to a feature from the registry (e.g., `F-001`) |
| `--issue #N` | Link to a GitHub Issue (auto-matches to a feature) |
| `--json` | Output result as JSON |

**Actions performed:**
1. Determines the workstream ID:
   - By default, auto-derives from the branch name by stripping prefixes (`feature/`, `fix/`, `hotfix/`, `bugfix/`, `chore/`, `refactor/`) and slugifying
   - `feature/add-auth` becomes `add-auth`
   - Or uses the `--name` override
2. Validates the branch is not protected (`main`, `master`, `develop`)
3. Captures your GitHub username via `gh api /user` for assignee tracking
4. If `--issue #N` is specified:
   - Fetches the issue via `gh issue view`
   - Matches it to a feature in the registry by issue number
   - Writes an `issue.md` file with issue metadata
5. If `--feature <id>` is specified:
   - Loads the feature from the registry
   - Pre-populates the workstream with feature context
6. Creates the workstream directory with:
   - `meta.json` — ID, branch, status, assignee, linked issue/feature
   - `state.json` — phase progress tracking (starts at Phase 1, discuss step)
   - `decisions.md` — empty decisions log
7. Auto-commits the new workstream files

**Output files:**
```
.branchos/workstreams/<workstream-id>/
├── meta.json
├── state.json
├── decisions.md
└── issue.md        (only if --issue was used)
```

**When to use:** After creating a feature branch, before starting the discuss-plan-execute cycle. Always create the workstream before running any phase commands.

**Errors:**
- Fails if a workstream already exists for the current branch
- Fails if on a protected branch

---

### `/branchos:list-workstreams`

**What it does:** Lists all workstreams in the repository with their current status, branch, and phase progress. Provides a quick overview of all active development work.

**Usage (Claude Code):**
```
/branchos:list-workstreams [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Output shows for each workstream:**
- Workstream ID
- Associated Git branch
- Status (`active` or `archived`)
- Current phase number and step (e.g., "Phase 2 / plan")
- Linked feature ID (if any)
- Assignee (if captured)
- Last activity timestamp

The current branch's workstream is highlighted with a `▶` indicator.

**When to use:** To see what's in progress across the team, or to find a specific workstream.

---

### `/branchos:status`

**What it does:** Shows a comprehensive dashboard combining workstream status, codebase map freshness, drift warnings, and cross-workstream conflict alerts. This is the "big picture" command.

**Usage (Claude Code):**
```
/branchos:status
```

**Dashboard sections:**
1. **Workstreams** — all active workstreams with phase progress (same as `list-workstreams`)
2. **Codebase Map** — freshness of each map file, staleness warnings
3. **Drift** — for the current workstream, shows planned vs actual file changes
4. **Conflicts** — file-level overlaps between active workstreams

**When to use:** At the start of a work session to get full situational awareness, or periodically to check for emerging conflicts.

---

### `/branchos:archive`

**What it does:** Marks a completed workstream as archived after its feature branch has been merged. The workstream's files are preserved for historical reference but it no longer appears in active listings.

**Usage (Claude Code):**
```
/branchos:archive [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |

**Actions performed:**
1. Resolves the workstream from the current branch
2. Updates `meta.json` status to `archived`
3. Updates `state.json` status to `completed`
4. If linked to a feature, updates the feature's status to `complete`
5. Auto-commits the status changes

**When to use:** After your PR has been merged and the feature branch work is done. This keeps the workstream listing clean while preserving all history.

---

## Phase Workflow Commands

These four commands form the core of BranchOS's development cycle. Each workstream progresses through phases, and each phase follows the **Discuss → Plan → Execute** pattern.

### `/branchos:context`

**What it does:** Assembles and outputs a structured context packet for Claude, containing everything relevant to the current phase and step. This is how Claude "remembers" your workstream state across sessions.

**Usage (Claude Code):**
```
/branchos:context [discuss | plan | execute]
```

**Arguments:**
- `discuss` — force discuss-step context
- `plan` — force plan-step context
- `execute` — force execute-step context
- *(no argument)* — auto-detect based on current phase state

**Auto-detection logic:**
1. If execute is in-progress or complete → load execute context
2. If plan is complete → load execute context (ready to implement)
3. If discuss is complete → load plan context (ready to plan)
4. Otherwise → load discuss context (starting fresh)

**Context includes (varies by step):**

| Step | Included Context |
|------|-----------------|
| **Discuss** | Architecture, conventions, accumulated decisions, research artifacts, feature description |
| **Plan** | Discussion output, modules map, conventions, accumulated decisions, research |
| **Execute** | Plan, execution tracking, branch diff summary, accumulated decisions |

**All steps include:**
- Workstream metadata (ID, branch, phase, step, statuses)
- Staleness warnings if the codebase map is outdated
- Warnings for missing artifacts (e.g., no discuss.md when loading plan context)

**When to use:**
- At the start of every new Claude Code session when resuming work
- After switching branches to a workstream
- When Claude seems to have lost context about your current task

---

### `/branchos:discuss-phase`

**What it does:** Creates (or updates) the discussion document for a phase. This is the first step in the Discuss → Plan → Execute cycle. It captures the intent, scope, and key decisions before any planning or coding begins.

**Usage (Claude Code):**
```
/branchos:discuss-phase [<phase-number>] [<description>]
```

**Examples:**
```
/branchos:discuss-phase                                    # discuss current phase
/branchos:discuss-phase 2                                  # discuss phase 2
/branchos:discuss-phase Add JWT authentication to the API  # discuss with goal
/branchos:discuss-phase 2 Add refresh token rotation       # phase 2 with goal
```

**Actions performed:**
1. Resolves the workstream from the current branch
2. Determines the target phase (current phase or specified number)
3. Gathers context:
   - Codebase map (architecture, conventions)
   - Prior phase artifacts (if this is phase 2+)
   - Accumulated decisions from previous phases
   - Feature description and acceptance criteria (if linked)
   - Research artifacts (if any)
4. Claude facilitates discussion and generates `discuss.md` with:
   - **Goal** — what this phase will achieve (one clear statement)
   - **Requirements** — specific, testable deliverables
   - **Assumptions** — things being taken for granted that could be wrong
   - **Unknowns** — open questions that need investigation
   - **Decisions** — choices made during the discussion, with context, alternatives considered, and rationale
5. Appends any new decisions to the workstream-level `decisions.md`
6. Updates `state.json`: marks discuss step as `complete`
7. Auto-commits

**Output file:** `.branchos/workstreams/<id>/phases/<n>/discuss.md`

**When to use:** As the first step when starting work on a new phase. Always discuss before planning.

---

### `/branchos:plan-phase`

**What it does:** Creates a concrete implementation plan based on the discussion context. The plan breaks work into specific tasks, identifies which files will be affected, notes dependencies and risks, and captures a git baseline for drift detection.

**Usage (Claude Code):**
```
/branchos:plan-phase [<phase-number>] [<direction>]
```

**Examples:**
```
/branchos:plan-phase                                           # plan current phase
/branchos:plan-phase 2                                         # plan phase 2
/branchos:plan-phase Use Passport.js instead of custom auth    # plan with direction
```

**Actions performed:**
1. Resolves the workstream and target phase
2. Reads `discuss.md` for context (warns if missing — discuss should come first)
3. Reads codebase map sections (modules, conventions, architecture) to understand code layout
4. If additional direction is provided, incorporates it into the plan
5. Claude generates `plan.md` with:
   - **Objective** — clear statement of what will be delivered
   - **Tasks** — ordered list, each containing:
     - Task description
     - Affected files (in backtick-quoted format: ``- `src/auth/middleware.ts` ``)
     - Dependencies on other tasks
     - Potential risks or gotchas
   - **Affected Files** — consolidated list of all files that will be modified or created
   - **Dependencies** — external dependencies or prerequisites
   - **Risks** — things that could go wrong
6. Captures the current `HEAD` commit hash as `planBaseline` — this is stored in `state.json` and used later by drift detection and execute-phase to determine what changed since the plan was made
7. Records any new decisions in `decisions.md`
8. Updates `state.json`: marks plan step as `complete`, stores `planBaseline`
9. Auto-commits

**Output file:** `.branchos/workstreams/<id>/phases/<n>/plan.md`

**Important:** The affected files format (`- \`path/to/file\``) is critical. BranchOS's drift detection (`check-drift`) and conflict detection (`detect-conflicts`) parse this format to build their file maps. Do not change the format.

**When to use:** After `discuss-phase` completes. The plan is your implementation guide — code against it, then track progress with `execute-phase`.

---

### `/branchos:execute-phase`

**What it does:** Tracks implementation progress by comparing the plan against actual git changes. It generates a status report showing which tasks are done, which are in progress, and which haven't been started yet.

**Usage (Claude Code):**
```
/branchos:execute-phase [<phase-number>]
```

**Actions performed:**
1. Resolves the workstream and target phase
2. Reads `plan.md` and parses the Affected Files section
3. Gets the `planBaseline` commit from `state.json`
4. Runs `git diff` from `planBaseline` to `HEAD` to determine which files have actually changed
5. Cross-references planned files vs changed files:
   - **Planned and changed** — on track
   - **Planned but not changed** — not yet implemented
   - **Changed but not planned** — unplanned work (may indicate scope creep or adaptation)
6. Assesses each task's completion status based on file changes
7. Generates/updates `execute.md` with:
   - **Completed Tasks** — done, with commit references where available
   - **In Progress** — partially implemented
   - **Remaining Tasks** — not yet started
   - **Blockers** — issues preventing progress
   - **Unplanned Changes** — files modified that weren't in the plan
8. Updates `state.json` with execution status
9. Auto-commits

**Output file:** `.branchos/workstreams/<id>/phases/<n>/execute.md`

**When to use:**
- After implementing some or all of the planned tasks — run it to get a progress snapshot
- Multiple times during implementation to keep tracking current
- Before creating a PR to verify all planned work is complete

---

## PR & Collaboration Commands

### `/branchos:create-pr`

**What it does:** Creates a GitHub Pull Request from the current workstream context, automatically populating the PR with feature descriptions, acceptance criteria formatted as checklists, and developer assignment.

**Usage (Claude Code):**
```
/branchos:create-pr
```

**Usage (terminal):**
```bash
branchos create-pr [--dry-run] [--json] [--cwd <path>]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview the PR title and body without creating it |
| `--json` | Output result as JSON |
| `--cwd <path>` | Override working directory |

**Actions performed:**
1. Resolves the current workstream from the branch
2. Loads the linked feature (if any) from the registry
3. Parses acceptance criteria from the feature body:
   - **Given/When/Then** blocks are formatted as checkbox checklists
   - **And** keywords inherit the preceding keyword's type
   - Incomplete GWT blocks are demoted to freeform checklist items
4. Assembles the PR body:
   - Feature description
   - GWT acceptance criteria as `- [ ]` checkboxes with indented Given/When/Then lines
   - Phase summary (if available)
5. Determines the assignee from workstream `meta.json`
6. Pushes the branch to the remote if it hasn't been pushed yet
7. Creates the PR via `gh pr create`
8. Returns the PR URL

**PR body format example:**
```markdown
## Feature: Add User Authentication

Implement JWT-based authentication for all API endpoints.

## Acceptance Criteria

- [ ] **AC-1**
  - Given a user is authenticated
  - When they request /api/data with a valid token
  - Then they receive a 200 response with the data
- [ ] **AC-2**
  - Given a user is not authenticated
  - When they request /api/data without a token
  - Then they receive a 401 response
```

**Requirements:**
- `gh` CLI installed and authenticated
- Workstream should be linked to a feature for best results

**When to use:** When implementation is complete and you're ready to open a pull request.

---

### `/branchos:research`

**What it does:** Starts an interactive research session where Claude investigates a topic using web searches, documentation reads, and codebase analysis. Findings can be saved as persistent research artifacts that are available during planning.

**Usage (Claude Code):**
```
/branchos:research                     # start interactive research
/branchos:research --save <topic>      # save current findings
```

**Options:**

| Flag | Description |
|------|-------------|
| `--save <topic>` | Save current research findings as a named artifact |

**Actions performed (interactive mode):**
1. Claude enters a research-focused mode with access to:
   - Web search and web fetch (for documentation, examples, best practices)
   - Codebase read and search (for understanding current implementation)
   - User interaction (for clarifying questions)
2. Claude investigates the topic through iterative exploration
3. Findings can be discussed and refined interactively

**Actions performed (save mode):**
1. Summarizes research findings into a structured document
2. Saves as a research artifact in `.branchos/shared/research/`:
   - `R-<NNN>-<topic-slug>.md` — the research document
   - Updates `index.json` — the research index
3. Auto-commits

**Output files:**
```
.branchos/shared/research/
├── index.json
├── R-001-jwt-best-practices.md
└── R-002-rate-limiting-approaches.md
```

**When to use:** Before planning a phase, when you need to investigate options, understand trade-offs, or gather information about an unfamiliar topic. Research artifacts are automatically included in context during `discuss-phase` and `plan-phase`.

**Tools available to Claude during this command:** Read, Glob, Grep, Write, Git, WebSearch, WebFetch, AskUserQuestion

---

## Monitoring Commands

### `branchos check-drift`

**What it does:** Compares the planned file changes in a phase's `plan.md` against actual file changes in git, reporting divergence between plan and reality.

**Usage:**
```bash
branchos check-drift [--phase <number>] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--phase <n>` | Check a specific phase (default: current) |
| `--json` | Output result as JSON |

**How it works:**
1. Reads `plan.md` and parses the Affected Files section (backtick-quoted paths)
2. Gets the `planBaseline` commit from `state.json`
3. Runs `git diff --name-only <planBaseline>..HEAD` to get actually changed files
4. Categorizes every file into one of three buckets:

| Category | Color | Meaning |
|----------|-------|---------|
| Planned and changed | Green | On track — file was planned and has been modified |
| Planned but not changed | Yellow | Incomplete — file is in the plan but hasn't been touched |
| Changed but not planned | Cyan | Unplanned — file was modified but wasn't in the plan |

**When to use:** During implementation to verify you're staying on track, or before `execute-phase` to preview what it will find.

---

### `branchos detect-conflicts`

**What it does:** Finds file-level conflicts between active workstreams. When multiple developers are working on different branches, this command identifies files that are being modified (or planned to be modified) by more than one workstream.

**Usage:**
```bash
branchos detect-conflicts [--all] [--json]
```

**Options:**

| Flag | Description |
|------|-------------|
| `--all` | Include archived workstreams in the analysis |
| `--json` | Output result as JSON |

**How it works:**
1. Scans all active workstreams
2. For each workstream, builds a file map from two sources:
   - **Planned files** — parsed from `plan.md` (backtick-quoted paths)
   - **Changed files** — actual git changes on the workstream's branch vs the nearest protected branch
3. Cross-references all workstream file maps
4. Reports overlapping files with severity levels:

| Severity | Condition | Risk |
|----------|-----------|------|
| **High** | Both workstreams have already changed the same file | Merge conflict is likely |
| **Medium** | One planned + one changed, or both planned the same file | Potential future conflict |

**Example output:**
```
  HIGH  src/auth/middleware.ts
        ├── payment-retry (changed)
        └── auth-refactor (changed)

  MEDIUM  src/utils/validation.ts
          ├── payment-retry (planned)
          └── auth-refactor (changed)
```

**When to use:** Regularly during active development, especially when multiple workstreams are in progress. Catching conflicts at "medium" severity lets you coordinate before they become merge nightmares.

---

## Data Model Summary

### Workstream Metadata (`meta.json`)

```json
{
  "schemaVersion": 3,
  "workstreamId": "add-auth",
  "branch": "feature/add-auth",
  "status": "active",
  "createdAt": "2026-03-10T10:00:00Z",
  "updatedAt": "2026-03-12T15:30:00Z",
  "assignee": "github-username",
  "issueNumber": 42,
  "featureId": "F-001"
}
```

### Workstream State (`state.json`)

```json
{
  "schemaVersion": 3,
  "status": "in-progress",
  "currentPhase": 1,
  "phases": [
    {
      "number": 1,
      "status": "active",
      "discuss": { "status": "complete", "createdAt": "...", "updatedAt": "..." },
      "plan": { "status": "complete", "createdAt": "...", "updatedAt": "...", "planBaseline": "abc1234" },
      "execute": { "status": "in-progress", "createdAt": "...", "updatedAt": "..." }
    }
  ]
}
```

### Feature File Frontmatter

```yaml
---
id: F-001
title: User Authentication
status: in-progress
milestone: M1
branch: feature/add-auth
issue: 42
workstream: add-auth
---
```

### Schema Versions

| Migration | Changes |
|-----------|---------|
| v0 → v1 | Added `schemaVersion` field |
| v1 → v2 | Added `currentPhase` and `phases` array |
| v2 → v3 | Added `assignee` and `issueNumber` fields |

Migrations run automatically when BranchOS reads state files, so upgrading is always safe.
