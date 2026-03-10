---
description: Push feature definitions to GitHub Issues for team coordination
allowed-tools: Bash(npx branchos *)
---

# Sync Issues

Push feature definitions to GitHub Issues for team coordination.

## Prerequisites

- Features must exist (run `/branchos:plan-roadmap` first)
- `gh` CLI must be installed (https://cli.github.com/)
- `gh` must be authenticated (`gh auth login`)

## Usage

Preview what would happen first:

```bash
npx branchos sync-issues --dry-run
```

Then sync for real:

```bash
npx branchos sync-issues $ARGUMENTS
```

## What it does

- Creates GitHub Issues for each non-complete, non-dropped feature
- Re-running updates existing issues (idempotent -- no duplicates)
- Adds status labels (unassigned, assigned, in-progress, etc.)
- Creates milestones matching feature milestones
- Adds dependency cross-references in issue body
- Stores issue numbers in feature frontmatter for tracking
- Auto-commits updated feature files

## Options

- `--dry-run`: Preview without making any API calls
- `--json`: Output structured JSON result
- `--force`: Sync even if no changes detected

$ARGUMENTS