---
description: Create a new BranchOS workstream
allowed-tools: Bash(npx branchos *)
---

# Create Workstream

Create a new BranchOS workstream for tracking development work.

```bash
npx branchos workstream create $ARGUMENTS
```

## Options

- `--name <name>`: Name for the workstream (required if not provided as argument)
- `--feature <id>`: Link workstream to a feature from the registry (e.g., F-001)
- `--json`: Output in machine-readable JSON format

## Examples

Create a basic workstream:
```bash
/branchos:create-workstream --name "Add user auth"
```

Create a workstream linked to a feature:
```bash
/branchos:create-workstream --name "Add user auth" --feature F-003
```

$ARGUMENTS
