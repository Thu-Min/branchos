---
description: Update execution state for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run `/context` first to load full workstream context for this session.

# Execute Phase

Update the execution state for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run `git branch --show-current` to get the current branch name.
2. Scan `.branchos/workstreams/*/meta.json` to find the workstream whose `branch` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \`branchos workstream create\` first."
4. Read the workstream's `state.json` via `.branchos/workstreams/<id>/state.json`.

**Determine target phase:**
- If `$ARGUMENTS` contains a number, use that as the target phase number.
- Otherwise, if `currentPhase > 0`, use `currentPhase`.
- Otherwise, stop with: "No active phase found. Run /discuss-phase or /plan-phase first."

## Step 2: Check for plan.md

Check if `.branchos/workstreams/<id>/phases/<n>/plan.md` exists.

If it does NOT exist, print warning: "No plan.md found for phase <n>. Execution tracking will be limited without a plan." Continue anyway.

## Step 3: Gather context

- Read `plan.md` for this phase to understand the planned tasks.
- Read existing `execute.md` if present (update rather than overwrite).
- Check git history since `planBaseline` (if set on the phase) to determine what work has been done.
- Inspect the actual file state of files listed in the plan's Affected Files section.

## Step 4: Generate or update execute.md

Assess each task from `plan.md` based on git history and file state. Generate/update `execute.md` with the following structure:

```markdown
# Phase <n> Execution

## Completed Tasks

### Task 1: <title>
- **Status:** Complete
- **Commits:** <relevant commit hashes>
- **Notes:** <any relevant observations>

## In Progress

### Task 3: <title>
- **Status:** In Progress
- **Progress:** <description of what's done and what remains>

## Remaining

### Task 4: <title>
- **Status:** Not Started
- **Blocked by:** <dependencies if any>

## Blockers

<List any blockers preventing progress, or "None" if clear>
```

If an existing `execute.md` is found, merge new information rather than discarding previous tracking data.

## Step 5: Write artifact

- Create the directory `.branchos/workstreams/<id>/phases/<n>/` if it does not exist.
- Write the generated content to `.branchos/workstreams/<id>/phases/<n>/execute.md`.

## Step 6: Update state.json

Read and update the workstream's `state.json`:

- Set the execute step status:
  - `"in-progress"` if some tasks are complete but not all
  - `"complete"` if all tasks from the plan are complete
- Set `updatedAt` to the current ISO 8601 timestamp.
- If `createdAt` is not set on the execute step, set it now.
- If ALL tasks are complete, also set the phase's `status` to `"completed"`.
- Write the updated state back to `state.json`.

## Step 7: Auto-commit

Stage and commit all changed files:

```bash
git add .branchos/workstreams/<id>/phases/<n>/execute.md .branchos/workstreams/<id>/state.json
git commit -m "chore(branchos): execute phase <n> for <workstream-id>"
```

$ARGUMENTS