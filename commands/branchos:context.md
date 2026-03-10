---
description: Load workstream context for current phase
allowed-tools: Bash(npx branchos *)
---

# Load Context

Run the following command to assemble context for your current workstream and phase:

```bash
npx branchos context $ARGUMENTS
```

Use the output as your working context for this session. The context packet includes:
- Workstream metadata and current phase status
- Relevant codebase map sections (architecture, conventions, modules)
- Branch diff summary showing what has changed
- Current phase artifacts (discussion, plan, or execution state)
- Accumulated decisions from all phases

If any warnings appear (e.g., stale codebase map), address them before proceeding.

You can pass an explicit step to override auto-detection: `/context discuss`, `/context plan`, or `/context execute`.

$ARGUMENTS