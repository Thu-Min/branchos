---
description: Archive a completed workstream after branch merge
allowed-tools: Bash(npx branchos *)
---

# Archive Workstream

Archive a completed workstream after its branch has been merged.

```bash
npx branchos archive $ARGUMENTS
```

## Options

- `--json`: Output in machine-readable JSON format

## What it does

- Moves workstream data from active to archived state
- Preserves all phase artifacts, decisions, and history
- Updates feature status if the workstream was linked to a feature
- Cleans up the active workstreams listing

## Prerequisites

- The workstream's branch should be merged before archiving
- Run from the repository root (any branch)

$ARGUMENTS
