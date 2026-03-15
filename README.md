# BranchOS

Branch-based AI-assisted development workflow management for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## The Problem

When multiple developers use AI-assisted tools (like Claude Code) in the same repository, their planning and execution state collides. AI-generated plans, decisions, and progress tracking get overwritten, become outdated, or conflict with each other.

## The Solution

BranchOS isolates planning and execution state **per Git branch** while maintaining a shared understanding of the codebase. Each developer gets their own workstream with independent phases, plans, and progress tracking — without corrupting anyone else's state.

**v2** adds a **project-level planning layer**: ingest an Amazon-style PR-FAQ, generate a roadmap with milestones and features, sync to GitHub Issues, and create feature-aware workstreams — all through Claude Code slash commands.

**v2.2** closes the developer loop with **PR workflow automation**: structured Given/When/Then acceptance criteria, automatic developer identity capture, issue-linked workstream creation, and one-command PR generation with full context.

## Requirements

- Node.js >= 20
- Git repository
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (for slash commands)
- [GitHub CLI (`gh`)](https://cli.github.com/) (for issue sync and PR creation)

## Install

```bash
npm install -g branchos
```

---

## Workflow: Building Software with BranchOS

Below is the complete step-by-step workflow — from project setup to shipping a PR.

### Overview

```
                        PROJECT SETUP (one-time)
                    ┌─────────────────────────────┐
                    │  1. branchos init            │
                    │  2. /branchos:map-codebase   │
                    └──────────────┬──────────────┘
                                   │
                        PROJECT PLANNING (once)
                    ┌──────────────┴──────────────┐
                    │  3. /branchos:discuss-project│
                    │  4. /branchos:ingest-prfaq   │
                    │  5. /branchos:plan-roadmap   │
                    │  6. /branchos:sync-issues    │
                    └──────────────┬──────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │  PER-FEATURE DEVELOPMENT   │──── repeat for each feature
                     │                            │
                     │  7.  git checkout -b ...    │
                     │  8.  /create-workstream     │
                     │  9.  /discuss-phase         │
                     │  10. /plan-phase            │
                     │  11. (write code)           │
                     │  12. /execute-phase         │
                     │  13. /create-pr             │
                     │  14. /archive               │
                     └────────────────────────────┘
```

---

### Step 1 — Initialize BranchOS

```bash
branchos init
```

**What it does:** Creates the `.branchos/` directory structure in your repo, adds `.branchos-runtime/` to `.gitignore`, auto-commits, and installs all slash commands into Claude Code.

**Directory created:**

```
.branchos/
├── config.json           # repo-level config
├── shared/
│   ├── codebase/         # shared codebase map (generated next)
│   ├── features/         # feature registry (generated from roadmap)
│   ├── PR-FAQ.md         # product definition (generated from discussion)
│   └── ROADMAP.md        # milestones & features (generated from PR-FAQ)
└── workstreams/           # per-branch workstream state
```

---

### Step 2 — Map the Codebase

In Claude Code:

```
/branchos:map-codebase
```

**What it does:** Claude analyzes your entire repository and generates 5 shared knowledge files in `.branchos/shared/codebase/`:

| File | What it captures |
|------|-----------------|
| `ARCHITECTURE.md` | High-level structure, entry points, data flow |
| `MODULES.md` | Directory-level module descriptions |
| `CONVENTIONS.md` | Code patterns, naming, organization |
| `STACK.md` | Dependencies and their purposes |
| `CONCERNS.md` | Tech debt and complexity observations |

These files give Claude deep understanding of your project. All workstreams share them. Re-run this command when the codebase changes significantly.

**Check map freshness anytime:**

```bash
branchos map-status
```

---

### Step 3 — Define Your Product (PR-FAQ)

In Claude Code:

```
/branchos:discuss-project
```

**What it does:** Starts a guided interactive discussion where Claude helps you write an Amazon-style **PR-FAQ** (Press Release + FAQ). This forces clarity on what you're building and why before writing any code.

The output is saved to `.branchos/shared/PR-FAQ.md`.

**Already have a PR-FAQ written?** Skip the discussion and ingest it directly:

```
/branchos:ingest-prfaq
```

---

### Step 4 — Generate the Roadmap

```
/branchos:plan-roadmap
```

**What it does:** Reads the PR-FAQ and generates:

- **`ROADMAP.md`** — milestones with ordered features, dependencies, and delivery sequence
- **`features/*.md`** — one file per feature with ID, description, branch name, and Given/When/Then acceptance criteria

**View features anytime:**

```
/branchos:features              # list all features
/branchos:features FEAT-01      # view details for a specific feature
```

**PR-FAQ changed?** Refresh the roadmap:

```
/branchos:refresh-roadmap
```

---

### Step 5 — Sync Features to GitHub Issues

```
/branchos:sync-issues
```

**What it does:** Creates a GitHub Issue for each feature in the registry. Team members can then self-assign issues on GitHub. When a developer creates a workstream from an issue, BranchOS links them together automatically.

---

### Step 6 — Create a Feature Branch

```bash
git checkout -b feature/add-auth
```

BranchOS auto-derives the workstream ID from the branch name by stripping common prefixes (`feature/`, `fix/`, `hotfix/`, etc.).

`feature/add-auth` becomes workstream `add-auth`.

> **Note:** You cannot create workstreams on protected branches (`main`, `master`, `develop`).

---

### Step 7 — Create a Workstream

In Claude Code:

```
/branchos:create-workstream
```

**What it does:** Creates an isolated workstream directory under `.branchos/workstreams/<id>/` with metadata and state tracking files.

**Options:**

```
/branchos:create-workstream --issue #42       # link to GitHub Issue (auto-matches feature)
/branchos:create-workstream --feature FEAT-01  # link to feature directly
/branchos:create-workstream --name my-custom-id # override auto-derived ID
```

When linked to an issue, BranchOS fetches the issue data, matches it to a feature, captures your GitHub username, and pre-populates the workstream with feature context.

---

### Step 8 — Discuss the Phase

```
/branchos:discuss-phase Add JWT authentication to the API
```

**What it does:** This is the first step of the **Discuss → Plan → Execute** cycle. Claude generates a `discuss.md` capturing:

- **Goal** — what this phase achieves
- **Requirements** — what must be true when done
- **Assumptions** — what you're taking for granted
- **Unknowns** — what needs investigation
- **Decisions** — choices made (also appended to a running `decisions.md`)

Claude uses the codebase map, feature context, and any prior phase history to inform the discussion.

---

### Step 9 — Plan the Phase

```
/branchos:plan-phase
```

**What it does:** Reads the discussion context and generates a `plan.md` with:

- **Objective** — clear goal statement
- **Tasks** — ordered list with affected files, dependencies, and risks
- **Affected Files** — consolidated list of all files that will be touched
- **Plan Baseline** — records the current HEAD commit for drift detection

You can provide direction to steer the plan:

```
/branchos:plan-phase Use Passport.js instead of custom middleware
```

---

### Step 10 — Write Your Code

This is where you (and Claude) do the actual implementation. Write code, run tests, iterate. BranchOS stays out of the way during this step.

---

### Step 11 — Track Execution

```
/branchos:execute-phase
```

**What it does:** Compares the plan against actual git changes since the plan baseline and generates `execute.md` with:

- **Completed Tasks** — matched against commits
- **In-Progress Tasks** — partially done
- **Remaining Tasks** — not yet started
- **Blockers** — anything preventing progress

**Check drift anytime from the terminal:**

```bash
branchos check-drift           # current phase
branchos check-drift --phase 2 # specific phase
```

---

### Step 12 — Create a PR

```
/branchos:create-pr
```

**What it does:** Assembles and creates a GitHub PR with:

- Feature description from the linked feature
- **Given/When/Then** acceptance criteria formatted as a checklist
- Phase context and implementation summary
- Auto-assigns you as the PR author

```bash
# Preview without creating:
branchos create-pr --dry-run
```

---

### Step 13 — Archive the Workstream

After the PR is merged:

```
/branchos:archive
```

**What it does:** Marks the workstream as archived. The state is preserved for history but the workstream no longer appears in active listings.

---

## Multi-Phase Work

Complex features often need multiple phases. After completing Phase 1, start Phase 2:

```
/branchos:discuss-phase 2 Add refresh token rotation
/branchos:plan-phase 2
# (implement)
/branchos:execute-phase 2
```

Each phase has its own discuss/plan/execute artifacts. Decisions accumulate across phases in `decisions.md`, giving Claude full context of prior work.

---

## Monitoring & Coordination

### Dashboard

```
/branchos:status
```

Shows all active workstreams, phase progress, map freshness, drift warnings, and cross-workstream conflicts.

### List Workstreams

```
/branchos:list-workstreams
```

### Detect Conflicts

```bash
branchos detect-conflicts        # active workstreams only
branchos detect-conflicts --all  # include archived
```

Finds file-level conflicts between workstreams (e.g., two developers editing the same file).

### Load Context

```
/branchos:context
```

Auto-detects the current phase step and loads the right context packet for Claude. Useful when starting a new Claude Code session mid-work.

### Research

```
/branchos:research
```

Start an interactive research session or save findings for reference during planning.

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `branchos init` | Initialize BranchOS and install slash commands |
| `branchos install-commands` | Install slash commands (use `--uninstall` to remove) |
| `branchos status [--all]` | Show all workstreams and their state |
| `branchos map-status` | Check codebase map freshness |
| `branchos check-drift [--phase N]` | Compare planned vs actual changes |
| `branchos detect-conflicts [--all]` | Find file conflicts between workstreams |
| `branchos create-pr [--dry-run]` | Create PR from workstream context |
| `branchos features` | List or view features |
| `branchos sync-issues` | Sync features to GitHub Issues |

## All Slash Commands

### Project Planning
| Command | Description |
|---------|-------------|
| `/branchos:discuss-project` | Create a PR-FAQ through guided discussion |
| `/branchos:ingest-prfaq` | Ingest an existing PR-FAQ document |
| `/branchos:plan-roadmap` | Generate roadmap and features from PR-FAQ |
| `/branchos:refresh-roadmap` | Refresh roadmap after PR-FAQ changes |
| `/branchos:features` | List or view feature details |
| `/branchos:sync-issues` | Push features to GitHub Issues |

### Workstream Lifecycle
| Command | Description |
|---------|-------------|
| `/branchos:create-workstream` | Create a new workstream |
| `/branchos:list-workstreams` | List all workstreams with status |
| `/branchos:archive` | Archive a completed workstream |

### Phase Workflow
| Command | Description |
|---------|-------------|
| `/branchos:context` | Load context for current phase step |
| `/branchos:discuss-phase` | Define work — goal, requirements, decisions |
| `/branchos:plan-phase` | Create implementation plan with tasks and risks |
| `/branchos:execute-phase` | Track execution progress against plan |

### PR & Research
| Command | Description |
|---------|-------------|
| `/branchos:create-pr` | Create GitHub PR with acceptance criteria |
| `/branchos:research` | Interactive research session |
| `/branchos:map-codebase` | Generate/refresh shared codebase map |
| `/branchos:status` | Show dashboard with all status info |

---

## How State is Organized

```
.branchos/
├── config.json
├── shared/                        # shared across all workstreams
│   ├── codebase/                  # AI-generated codebase map
│   │   ├── ARCHITECTURE.md
│   │   ├── MODULES.md
│   │   ├── CONVENTIONS.md
│   │   ├── STACK.md
│   │   └── CONCERNS.md
│   ├── PR-FAQ.md                  # product definition
│   ├── ROADMAP.md                 # milestones and features
│   └── features/                  # feature registry
│       ├── feature-001.md
│       └── feature-002.md
└── workstreams/
    └── add-auth/                  # one per workstream
        ├── meta.json              # ID, branch, status, assignee, linked issue/feature
        ├── state.json             # phase progress tracking
        ├── decisions.md           # accumulated decisions across phases
        ├── issue.md               # GitHub issue metadata (if linked)
        └── phases/
            └── 1/
                ├── discuss.md     # goal, requirements, assumptions, unknowns
                ├── plan.md        # tasks, affected files, dependencies, risks
                └── execute.md     # completed, in-progress, remaining tasks
```

All state is committed to git, enabling full auditability and team visibility across branches.

---

## Documentation

- [Getting Started](docs/getting-started.md) — Full setup walkthrough
- [Commands Reference](docs/commands.md) — Detailed reference for every command
- [CLI Reference](docs/cli-reference.md) — All terminal commands in detail
- [Phase Workflow](docs/phase-workflow.md) — The Discuss → Plan → Execute cycle
- [Slash Commands](docs/slash-commands.md) — Claude Code integration
- [PR Workflow](docs/pr-workflow.md) — Issue linking, acceptance criteria, and PR creation
- [Conflict Detection](docs/conflict-detection.md) — Cross-workstream conflict analysis
- [Configuration](docs/configuration.md) — Config options and directory structure

## License

MIT
