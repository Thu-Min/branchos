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
- Auto-installs all 16 slash commands into Claude Code

**Errors:**
- Fails if the current directory is not a Git repository

---

## `branchos install-commands`

Install or remove BranchOS slash commands for Claude Code.

```bash
branchos install-commands [--uninstall]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--uninstall` | Remove previously installed slash commands |

**What it does:**
- Writes 16 `branchos:*.md` command files to both `~/.claude/commands/` and `~/.claude/skills/`
- Commands are bundled into the CLI at build time, so they always match the installed version
- Restart Claude Code after install

**Note:** You don't normally need to run this manually — `branchos init` calls it automatically.

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

## `branchos create-pr`

Create a GitHub PR from workstream context with feature-linked metadata and acceptance criteria.

```bash
branchos create-pr [--json] [--dry-run] [--cwd <path>]
```

**Options:**
| Flag | Description |
|------|-------------|
| `--json` | Output result as JSON |
| `--dry-run` | Show what would be created without creating the PR |
| `--cwd <path>` | Override working directory |

**What it does:**
- Resolves the current workstream and its linked feature
- Parses GWT (Given/When/Then) acceptance criteria from the feature body
- Assembles a PR body with feature description and formatted acceptance criteria checklist
- Assigns the PR to the workstream developer (from workstream metadata)
- Pushes the branch to remote if needed
- Creates the PR via `gh pr create`

**Requirements:**
- `gh` CLI must be installed and authenticated
- Workstream should be linked to a feature (via `--feature` or `--issue`)
