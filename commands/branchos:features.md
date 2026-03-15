---
description: "List features or view details [<feature-id>] [--status <status>] [--milestone <id>] [--json]"
allowed-tools: Bash(npx branchos features *)
---

# Features

List and view features from the BranchOS feature registry.

```bash
npx branchos features $ARGUMENTS
```

Usage examples:
- `/branchos:features` -- List all features in a table
- `/branchos:features F-001` -- View details for feature F-001
- `/branchos:features --status unassigned` -- Filter by status
- `/branchos:features --milestone M1` -- Filter by milestone
- `/branchos:features --json` -- Output as JSON

$ARGUMENTS