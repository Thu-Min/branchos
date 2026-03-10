---
description: List all BranchOS workstreams with status
allowed-tools: Bash(npx branchos *)
---

# List Workstreams

List all BranchOS workstreams with their current status.

```bash
npx branchos status $ARGUMENTS
```

## Options

- `--json`: Output in machine-readable JSON format

## Output

Displays a table of all workstreams with:
- Workstream ID and name
- Current branch
- Phase progress
- Feature link (if any)

$ARGUMENTS
