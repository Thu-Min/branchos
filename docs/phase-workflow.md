# Phase Workflow

BranchOS organizes work into **phases**, each following a three-step cycle: **Discuss → Plan → Execute**. This structured approach ensures that AI-assisted development stays focused, trackable, and aligned with your goals.

## Overview

```
Phase 1                    Phase 2                    Phase 3
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Discuss → Plan → │  ──▶ │ Discuss → Plan → │  ──▶ │ Discuss → Plan → │
│ Execute          │      │ Execute          │      │ Execute          │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

Each phase represents a unit of work within a workstream. A workstream can have multiple phases, allowing you to break complex features into manageable chunks.

## Step 1: Discuss

**Purpose:** Define what the phase will achieve before writing any code.

**How to run:**

In Claude Code:
```
/branchos:discuss-phase
```

Or from the terminal:
```bash
branchos discuss
```

**What happens:**
1. BranchOS resolves your workstream from the current branch
2. Claude gathers context from the codebase map, previous decisions, and prior phases
3. A `discuss.md` file is generated with:
   - **Goal** - What this phase aims to achieve
   - **Requirements** - Specific deliverables
   - **Assumptions** - What is being taken for granted
   - **Unknowns** - Open questions that need answers
   - **Decisions** - Choices made during discussion

**Output:** `.branchos/workstreams/<id>/phases/<n>/discuss.md`

**Tip:** Provide arguments to guide the discussion:
```
/branchos:discuss-phase Add user authentication with JWT tokens
```

## Step 2: Plan

**Purpose:** Create a concrete implementation plan with tasks and affected files.

**How to run:**

In Claude Code:
```
/branchos:plan-phase
```

Or from the terminal:
```bash
branchos plan
```

**What happens:**
1. Claude reads the `discuss.md` for context
2. Analyzes the codebase map to understand architecture and conventions
3. Generates a `plan.md` with:
   - **Objective** - Summary of what will be delivered
   - **Tasks** - Ordered list of implementation tasks, each with:
     - Affected files (in backtick-quoted format for drift detection)
     - Dependencies on other tasks
     - Potential risks
   - **Affected Files** - Consolidated list of all files that will be modified

4. Captures the current `HEAD` commit as `planBaseline` for later drift comparison

**Output:** `.branchos/workstreams/<id>/phases/<n>/plan.md`

**Important:** The affected files format (`- \`path/to/file\``) is critical. BranchOS parses this for drift detection and conflict analysis.

## Step 3: Execute

**Purpose:** Track implementation progress against the plan.

**How to run:**

After implementing the planned changes, run in Claude Code:
```
/branchos:execute-phase
```

Or from the terminal:
```bash
branchos execute
```

**What happens:**
1. Claude reads the plan and examines the git history since `planBaseline`
2. Compares planned files against actually changed files
3. Assesses each task's completion status
4. Generates `execute.md` with:
   - **Completed Tasks** - With commit references
   - **In Progress** - Partially done work
   - **Remaining** - Tasks not yet started
   - **Blockers** - Issues preventing progress

**Output:** `.branchos/workstreams/<id>/phases/<n>/execute.md`

You can run execute multiple times during implementation to update the tracking status.

## Phase State Machine

Each step within a phase tracks its own status:

```
not-started → in-progress → complete
```

Phase-level status:
```
active → completed
```

The `state.json` file records these statuses along with timestamps.

## Multiple Phases

Workstreams can have multiple sequential phases. When a phase is complete, start a new one:

```
/branchos:discuss-phase 2
```

This is useful for:
- Breaking large features into incremental deliverables
- Adjusting direction after learning from earlier phases
- Keeping plans manageable and focused

## Context Loading

Before starting any phase step, load the relevant context:

```
/branchos:context
```

BranchOS auto-detects which context to load based on the current phase state:
- Before discuss → Loads architecture, conventions, decisions
- Before plan → Loads discussion, modules, conventions, decisions
- Before execute → Loads plan, execution state, decisions

## Decisions Log

Important decisions made during any phase step are recorded in `decisions.md` at the workstream level. This provides a persistent record that carries across phases, ensuring consistency and preventing repeated debates about resolved questions.

Each decision entry includes:
- Title
- Phase number
- Context (why the decision was needed)
- What was chosen
- Alternatives that were considered
