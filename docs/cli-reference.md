# CLI Reference

Complete reference for all BranchOS terminal commands.

## `branchos init`

Initialize BranchOS in the current Git repository.

```bash
branchos init
```

**What it does:**
- Creates `.branchos/` directory with `shared/`, `workstreams/`, and `config.json`
- Adds `.branchos-runtime/` to `.gitignore`
- Auto-commits the initialization

**Errors:**
- Fails if the current directory is not a Git repository

---

## `branchos workstream create`

Create a new workstream linked to the current Git branch.

```bash
branchos workstream create [--name <custom-name>]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--name <name>` | Override the auto-generated workstream ID |

**Behavior:**
- Auto-derives the workstream ID from the branch name by stripping prefixes (`feature/`, `fix/`, `hotfix/`, `bugfix/`, `release/`) and slugifying
- Creates `.branchos/workstreams/<id>/` with `meta.json` and `state.json`
- Auto-commits the new workstream

**Branch name to ID examples:**
| Branch | Workstream ID |
|--------|---------------|
| `feature/payment-retry` | `payment-retry` |
| `fix/urgent-bug` | `urgent-bug` |
| `hotfix/security-patch` | `security-patch` |
| `my-feature` | `my-feature` |

**Restrictions:**
- Cannot create workstreams on protected branches: `main`, `master`, `develop`
- Cannot create duplicate workstreams for the same branch

---

## `branchos status`

Display all workstreams and their current state.

```bash
branchos status [--all]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--all` | Include archived workstreams |

**Output columns:**
- **Workstream** - The workstream ID
- **Branch** - Associated Git branch
- **Phase** - Current phase number and step (e.g., "Phase 1 / plan")
- **Last Activity** - Timestamp of last update
- **Status** - `active` or `archived`

The current branch's workstream is marked with a `▶` indicator.

---

## `branchos map-status`

Check the freshness of the codebase map.

```bash
branchos map-status
```

**Output:**
- Shows when each map file was generated and at which commit
- Reports how many commits behind the map is compared to HEAD
- Warns if the map is stale (default threshold: 20 commits)

---

## `branchos discuss`

Create or update discussion context for the current phase.

```bash
branchos discuss [phase-number]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `phase-number` | Target phase number (optional, auto-detected) |

**What it does:**
- Resolves the workstream from the current branch
- Creates `discuss.md` in the phase directory
- Updates `state.json` to mark discussion as complete
- Records decisions in `decisions.md`
- Auto-commits

---

## `branchos plan`

Create an implementation plan for the current phase.

```bash
branchos plan [phase-number]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `phase-number` | Target phase number (optional, auto-detected) |

**What it does:**
- Reads `discuss.md` for context (warns if missing)
- Creates `plan.md` with tasks, affected files, dependencies, and risks
- Captures `planBaseline` (current HEAD commit hash) for drift detection
- Updates `state.json` and auto-commits

---

## `branchos execute`

Update the execution state for the current phase.

```bash
branchos execute [phase-number]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `phase-number` | Target phase number (optional, auto-detected) |

**What it does:**
- Compares planned files against actual git changes since `planBaseline`
- Generates `execute.md` categorizing tasks as completed, in-progress, or remaining
- Updates `state.json` with execution status
- Auto-commits

---

## `branchos check-drift`

Compare planned changes against actual changes for drift detection.

```bash
branchos check-drift [--phase <number>]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--phase <n>` | Check drift for a specific phase (default: current) |

**Output categories (color-coded):**
- **Green** - Planned and changed (on track)
- **Yellow** - Planned but not changed (incomplete)
- **Cyan** - Changed but not planned (unplanned work)

---

## `branchos detect-conflicts`

Find file-level conflicts between active workstreams.

```bash
branchos detect-conflicts [--all]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--all` | Include archived workstreams |

**Severity levels:**
- **High** - Both workstreams have already changed the same file
- **Medium** - One workstream planned and the other changed (or both planned) the same file

---

## `branchos context`

Assemble a context packet for Claude Code.

```bash
branchos context [step]
```

**Arguments:**
| Argument | Description |
|----------|-------------|
| `step` | Force a specific step: `discuss`, `plan`, or `execute` |

**Auto-detection logic:**
If no step is provided, BranchOS determines the appropriate context based on the current phase state:
1. If execute is in-progress or complete → `execute` context
2. If plan is complete → `execute` context
3. If discuss is complete → `plan` context
4. Otherwise → `discuss` context

---

## `branchos archive`

Archive a completed workstream.

```bash
branchos archive <workstream-id> [--force]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--force` | Archive even if the branch hasn't been merged |

**Behavior:**
- By default, checks that the branch has been merged into a protected branch before archiving
- Sets the workstream status to `archived`
- Auto-commits

---

## `branchos unarchive`

Restore an archived workstream.

```bash
branchos unarchive <workstream-id>
```

Sets the workstream status back to `active` and auto-commits.

---

## `branchos install-commands`

Install BranchOS slash commands for Claude Code.

```bash
branchos install-commands [--uninstall]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--uninstall` | Remove previously installed slash commands |

**Installed commands:**
- `/branchos:map-codebase`
- `/branchos:context`
- `/branchos:discuss-phase`
- `/branchos:plan-phase`
- `/branchos:execute-phase`

Commands are installed to `~/.claude/commands/`. Restart Claude Code after install.
