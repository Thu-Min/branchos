---
description: "Create a new BranchOS workstream [--name <name>] [--feature <id>] [--issue <n>] [--yes] [--json]"
allowed-tools: Bash(npx branchos *)
---

# Create Workstream

Create a new BranchOS workstream for tracking development work.

```bash
npx branchos workstream create $ARGUMENTS
```

## Options

- `--name <name>`: Override the auto-derived workstream ID
- `--feature <id>`: Link workstream to a feature from the registry (e.g., F-001)
- `--issue <number>`: Create from a GitHub issue (matches by issue number or title)
- `--yes`: Skip interactive prompts and auto-accept (required when the feature branch already exists and you're invoking from a slash command or other non-interactive context)
- `--json`: Output in machine-readable JSON format

## Examples

Create a basic workstream from the current branch:
```bash
/branchos:create-workstream
```

Create a workstream linked to a feature:
```bash
/branchos:create-workstream --feature F-003
```

Create from a GitHub issue, auto-accepting the existing branch:
```bash
/branchos:create-workstream --issue 42 --yes
```

$ARGUMENTS
