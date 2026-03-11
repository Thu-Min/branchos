---
description: Create or update discussion context for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run `/context` first to load full workstream context for this session.

# Discuss Phase

Create or update discussion context for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run `git branch --show-current` to get the current branch name.
2. Scan `.branchos/workstreams/*/meta.json` to find the workstream whose `branch` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \`branchos workstream create\` first."
4. Read the workstream's `state.json` via `.branchos/workstreams/<id>/state.json`.

**Determine target phase:**
- If `$ARGUMENTS` contains a number, use that as the target phase number.
- Otherwise, if `currentPhase > 0` and the current phase's discuss step is `not-started`, use `currentPhase`.
- Otherwise, use `phases.length + 1` (next new phase).

## Step 2: Check for existing discuss.md

Check if `.branchos/workstreams/<id>/phases/<n>/discuss.md` already exists.

If it does, warn: "A discuss.md already exists for phase <n>. Overwrite? (Proceeding will replace it.)" and wait for user confirmation before continuing.

## Step 3: Gather context

- Read the codebase map from `.branchos/shared/codebase/` (ARCHITECTURE.md, MODULES.md, etc.) for architecture context.
- Read any existing decisions from `.branchos/workstreams/<id>/decisions.md`.
- Read previous phase artifacts if they exist (to understand progression).
- Research summaries from `.branchos/shared/research/` are automatically included in the context packet when research artifacts exist (via `/context` assembly). No manual reading needed.

## Step 4: Generate discuss.md

Use the user's arguments as guidance for what to discuss. Generate a `discuss.md` file with the following sections:

```markdown
# Phase <n> Discussion

## Goal

<What this phase aims to achieve>

## Requirements

<Specific requirements derived from the goal>

## Assumptions

<Assumptions being made>

## Unknowns

<Open questions that need answers>

## Decisions

<Any decisions made during discussion>
```

## Step 5: Write artifact

- Create the directory `.branchos/workstreams/<id>/phases/<n>/` if it does not exist.
- Write the generated content to `.branchos/workstreams/<id>/phases/<n>/discuss.md`.

## Step 6: Update state.json

Read and update the workstream's `state.json`:

- If the target phase does not exist in the `phases` array, add a new phase object:
  ```json
  {
    "number": <n>,
    "status": "active",
    "discuss": { "status": "not-started" },
    "plan": { "status": "not-started" },
    "execute": { "status": "not-started" }
  }
  ```
- Set the discuss step to:
  ```json
  {
    "status": "complete",
    "createdAt": "<ISO 8601 timestamp>",
    "updatedAt": "<ISO 8601 timestamp>"
  }
  ```
- Set `currentPhase` to this phase number.
- Write the updated state back to `state.json`.

## Step 7: Update decisions log

If any decisions were identified during discussion, append each to `.branchos/workstreams/<id>/decisions.md` using this format:

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
git add .branchos/workstreams/<id>/phases/<n>/discuss.md .branchos/workstreams/<id>/state.json .branchos/workstreams/<id>/decisions.md
git commit -m "chore(branchos): discuss phase <n> for <workstream-id>"
```

$ARGUMENTS