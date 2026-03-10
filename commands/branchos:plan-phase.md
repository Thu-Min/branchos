---
description: Create implementation plan for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run `/context` first to load full workstream context for this session.

# Plan Phase

Create an implementation plan for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run `git branch --show-current` to get the current branch name.
2. Scan `.branchos/workstreams/*/meta.json` to find the workstream whose `branch` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \`branchos workstream create\` first."
4. Read the workstream's `state.json` via `.branchos/workstreams/<id>/state.json`.

**Determine target phase:**
- If `$ARGUMENTS` contains a number, use that as the target phase number.
- Otherwise, if `currentPhase > 0`, use `currentPhase`.
- Otherwise, use `phases.length + 1` (next new phase).

## Step 2: Check for discuss.md

Check if `.branchos/workstreams/<id>/phases/<n>/discuss.md` exists.

If it does NOT exist, print warning: "No discuss.md found for phase <n>. Planning without discussion context." Continue anyway.

## Step 3: Gather context

- Read `discuss.md` for this phase if it exists (primary input for planning).
- Read the codebase map from `.branchos/shared/codebase/` (ARCHITECTURE.md, MODULES.md, etc.).
- Read existing decisions from `.branchos/workstreams/<id>/decisions.md`.
- Read the user's arguments for additional planning direction.

## Step 4: Generate plan.md

Generate a `plan.md` with the following structure:

```markdown
# Phase <n> Plan

## Objective

<What this phase will deliver>

## Tasks

### Task 1: <title>

<Description of what needs to be done>

#### Affected Files

- \`path/to/file1.ts\`
- \`path/to/file2.ts\`

#### Dependencies

<What this task depends on>

#### Risks

<Potential issues>

### Task 2: <title>

...

## Affected Files

<Consolidated list of ALL unique files across all tasks>

- \`path/to/file1.ts\`
- \`path/to/file2.ts\`
- \`path/to/file3.ts\`
```

**CRITICAL:** The `#### Affected Files` and `## Affected Files` sections MUST use `- \`path/to/file\`` syntax (backtick-quoted file paths as list items). This format is parsed by drift detection.

## Step 5: Write artifact

- Create the directory `.branchos/workstreams/<id>/phases/<n>/` if it does not exist.
- Write the generated content to `.branchos/workstreams/<id>/phases/<n>/plan.md`.

## Step 6: Update state.json

Read and update the workstream's `state.json`:

- If the target phase does not exist in the `phases` array, add a new phase object.
- Set the plan step to:
  ```json
  {
    "status": "complete",
    "createdAt": "<ISO 8601 timestamp>",
    "updatedAt": "<ISO 8601 timestamp>"
  }
  ```
- Store `planBaseline` on the phase object by running `git rev-parse HEAD` and saving the hash.
- Set `currentPhase` to this phase number.
- Write the updated state back to `state.json`.

## Step 7: Update decisions log

If any decisions were made during planning, append each to `.branchos/workstreams/<id>/decisions.md` using the format:

```markdown
### <title>

**Phase:** <n>
**Context:** <why this decision was needed>
**Decision:** <what was chosen>
**Alternatives considered:**
- <alternative 1>
- <alternative 2>

---
```

If `decisions.md` does not exist, create it with a `# Decisions` header first.

## Step 8: Auto-commit

Stage and commit all changed files:

```bash
git add .branchos/workstreams/<id>/phases/<n>/plan.md .branchos/workstreams/<id>/state.json .branchos/workstreams/<id>/decisions.md
git commit -m "chore(branchos): plan phase <n> for <workstream-id>"
```

$ARGUMENTS