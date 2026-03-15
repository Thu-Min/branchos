---
description: Create a GitHub PR from workstream context
allowed-tools: Bash(npx branchos *), AskUserQuestion
---

# Create PR

First, preview the PR that will be created:

```bash
npx branchos create-pr --dry-run $ARGUMENTS
```

Review the output above. If the PR title and body look correct, ask the user to confirm using AskUserQuestion with options "Create PR" and "Cancel".

If confirmed, create the PR:

```bash
npx branchos create-pr $ARGUMENTS
```

Report the PR URL from the output.

$ARGUMENTS
