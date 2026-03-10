import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const COMMANDS: Record<string, string> = {
  'branchos:map-codebase.md': `---
description: Generate or refresh the codebase map in .branchos/shared/codebase/
allowed-tools: Read, Glob, Grep, Write, Bash(git rev-parse HEAD), Bash(git add *), Bash(git commit *)
---

# Codebase Map Generation

Generate or refresh the codebase map files in \`.branchos/shared/codebase/\`.

## Step 1: Read configuration

Read \`.branchos/config.json\`. If the \`map\` field does not exist, or if \`map.excludes\` is missing, update \`config.json\` to add default excludes:

\`\`\`json
{
  "map": {
    "excludes": ["node_modules", "dist", "build", ".branchos", ".git", "*.lock", "*.min.*"],
    "stalenessThreshold": 20
  }
}
\`\`\`

If \`map.stalenessThreshold\` does not exist, set it to \`20\`. Preserve all other existing config fields.

## Step 2: Get current commit hash

Run \`git rev-parse HEAD\` to get the current commit hash. Store it for use in the metadata headers.

## Step 3: Analyze the codebase

Use the Glob and Read tools to explore the repository. Exclude paths matching the exclude patterns from config (e.g., node_modules, dist, build, .branchos, .git, lock files, minified files).

Analyze the codebase to produce 5 map files. For each file, follow the specific content guidelines below:

### ARCHITECTURE.md

Document the high-level structure, entry points, and data flow between modules.

- Include a directory tree of the top 2 levels
- Describe the overall architecture pattern (e.g., CLI app, layered, modular)
- Identify main entry points and their roles
- Describe how data flows through the system (command input -> parsing -> state -> output)
- Note any important boundaries between subsystems

### MODULES.md

Provide directory-level summaries (NOT file-level inventory).

For each major directory:
- Its purpose and responsibility
- Key exports that other modules depend on
- Relationships to other modules (imports/dependencies)

Only call out individual files when they are important entry points or contain complex logic worth noting.

### CONVENTIONS.md

Document code patterns ONLY (not workflow or process conventions).

Cover:
- Naming conventions (files, functions, types, constants)
- File organization patterns
- State management approach
- Error handling patterns
- Import/export patterns (barrel exports, etc.)

Include brief code examples where helpful to illustrate patterns.

### STACK.md

List each dependency from \`package.json\` with its purpose and role in the project.

- Do NOT pin versions (package.json tracks versions)
- Group by: runtime dependencies, dev dependencies
- For each dependency, explain why the project uses it

### CONCERNS.md

Provide descriptive observations of tech debt, complexity hotspots, and potential risks.

- Do NOT include prescriptive fix suggestions
- Just describe what you observe
- Note areas of high complexity or coupling
- Flag any patterns that may cause issues as the codebase grows

## Step 4: Write map files

Write each of the 5 files to \`.branchos/shared/codebase/\`. Create the directory if it does not exist.

Each file MUST start with this metadata header (YAML frontmatter):

\`\`\`
---
generated: <ISO 8601 timestamp, e.g. 2026-03-08T04:00:00Z>
commit: <HEAD hash from step 2>
generator: branchos/map-codebase
---
\`\`\`

The 5 files to write:
- \`.branchos/shared/codebase/ARCHITECTURE.md\`
- \`.branchos/shared/codebase/MODULES.md\`
- \`.branchos/shared/codebase/CONVENTIONS.md\`
- \`.branchos/shared/codebase/STACK.md\`
- \`.branchos/shared/codebase/CONCERNS.md\`

## Step 5: Auto-commit

Stage and commit the generated files:

\`\`\`bash
git add .branchos/shared/codebase/ARCHITECTURE.md .branchos/shared/codebase/MODULES.md .branchos/shared/codebase/CONVENTIONS.md .branchos/shared/codebase/STACK.md .branchos/shared/codebase/CONCERNS.md .branchos/config.json
git commit -m "chore(branchos): refresh codebase map"
\`\`\`

$ARGUMENTS`,

  'branchos:context.md': `---
description: Load workstream context for current phase
allowed-tools: Bash(npx branchos *)
---

# Load Context

Run the following command to assemble context for your current workstream and phase:

\`\`\`bash
npx branchos context $ARGUMENTS
\`\`\`

Use the output as your working context for this session. The context packet includes:
- Workstream metadata and current phase status
- Relevant codebase map sections (architecture, conventions, modules)
- Branch diff summary showing what has changed
- Current phase artifacts (discussion, plan, or execution state)
- Accumulated decisions from all phases

If any warnings appear (e.g., stale codebase map), address them before proceeding.

You can pass an explicit step to override auto-detection: \`/context discuss\`, \`/context plan\`, or \`/context execute\`.

$ARGUMENTS`,

  'branchos:discuss-phase.md': `---
description: Create or update discussion context for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run \`/context\` first to load full workstream context for this session.

# Discuss Phase

Create or update discussion context for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run \`git branch --show-current\` to get the current branch name.
2. Scan \`.branchos/workstreams/*/meta.json\` to find the workstream whose \`branch\` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \\\`branchos workstream create\\\` first."
4. Read the workstream's \`state.json\` via \`.branchos/workstreams/<id>/state.json\`.

**Determine target phase:**
- If \`$ARGUMENTS\` contains a number, use that as the target phase number.
- Otherwise, if \`currentPhase > 0\` and the current phase's discuss step is \`not-started\`, use \`currentPhase\`.
- Otherwise, use \`phases.length + 1\` (next new phase).

## Step 2: Check for existing discuss.md

Check if \`.branchos/workstreams/<id>/phases/<n>/discuss.md\` already exists.

If it does, warn: "A discuss.md already exists for phase <n>. Overwrite? (Proceeding will replace it.)" and wait for user confirmation before continuing.

## Step 3: Gather context

- Read the codebase map from \`.branchos/shared/codebase/\` (ARCHITECTURE.md, MODULES.md, etc.) for architecture context.
- Read any existing decisions from \`.branchos/workstreams/<id>/decisions.md\`.
- Read previous phase artifacts if they exist (to understand progression).

## Step 4: Generate discuss.md

Use the user's arguments as guidance for what to discuss. Generate a \`discuss.md\` file with the following sections:

\`\`\`markdown
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
\`\`\`

## Step 5: Write artifact

- Create the directory \`.branchos/workstreams/<id>/phases/<n>/\` if it does not exist.
- Write the generated content to \`.branchos/workstreams/<id>/phases/<n>/discuss.md\`.

## Step 6: Update state.json

Read and update the workstream's \`state.json\`:

- If the target phase does not exist in the \`phases\` array, add a new phase object:
  \`\`\`json
  {
    "number": <n>,
    "status": "active",
    "discuss": { "status": "not-started" },
    "plan": { "status": "not-started" },
    "execute": { "status": "not-started" }
  }
  \`\`\`
- Set the discuss step to:
  \`\`\`json
  {
    "status": "complete",
    "createdAt": "<ISO 8601 timestamp>",
    "updatedAt": "<ISO 8601 timestamp>"
  }
  \`\`\`
- Set \`currentPhase\` to this phase number.
- Write the updated state back to \`state.json\`.

## Step 7: Update decisions log

If any decisions were identified during discussion, append each to \`.branchos/workstreams/<id>/decisions.md\` using this format:

\`\`\`markdown
### <title>

**Phase:** <n>
**Context:** <why this decision was needed>
**Decision:** <what was chosen>
**Alternatives considered:**
- <alternative 1>
- <alternative 2>

---
\`\`\`

If \`decisions.md\` does not exist, create it with a \`# Decisions\` header first.

## Step 8: Auto-commit

Stage and commit all changed files:

\`\`\`bash
git add .branchos/workstreams/<id>/phases/<n>/discuss.md .branchos/workstreams/<id>/state.json .branchos/workstreams/<id>/decisions.md
git commit -m "chore(branchos): discuss phase <n> for <workstream-id>"
\`\`\`

$ARGUMENTS`,

  'branchos:plan-phase.md': `---
description: Create implementation plan for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run \`/context\` first to load full workstream context for this session.

# Plan Phase

Create an implementation plan for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run \`git branch --show-current\` to get the current branch name.
2. Scan \`.branchos/workstreams/*/meta.json\` to find the workstream whose \`branch\` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \\\`branchos workstream create\\\` first."
4. Read the workstream's \`state.json\` via \`.branchos/workstreams/<id>/state.json\`.

**Determine target phase:**
- If \`$ARGUMENTS\` contains a number, use that as the target phase number.
- Otherwise, if \`currentPhase > 0\`, use \`currentPhase\`.
- Otherwise, use \`phases.length + 1\` (next new phase).

## Step 2: Check for discuss.md

Check if \`.branchos/workstreams/<id>/phases/<n>/discuss.md\` exists.

If it does NOT exist, print warning: "No discuss.md found for phase <n>. Planning without discussion context." Continue anyway.

## Step 3: Gather context

- Read \`discuss.md\` for this phase if it exists (primary input for planning).
- Read the codebase map from \`.branchos/shared/codebase/\` (ARCHITECTURE.md, MODULES.md, etc.).
- Read existing decisions from \`.branchos/workstreams/<id>/decisions.md\`.
- Read the user's arguments for additional planning direction.

## Step 4: Generate plan.md

Generate a \`plan.md\` with the following structure:

\`\`\`markdown
# Phase <n> Plan

## Objective

<What this phase will deliver>

## Tasks

### Task 1: <title>

<Description of what needs to be done>

#### Affected Files

- \\\`path/to/file1.ts\\\`
- \\\`path/to/file2.ts\\\`

#### Dependencies

<What this task depends on>

#### Risks

<Potential issues>

### Task 2: <title>

...

## Affected Files

<Consolidated list of ALL unique files across all tasks>

- \\\`path/to/file1.ts\\\`
- \\\`path/to/file2.ts\\\`
- \\\`path/to/file3.ts\\\`
\`\`\`

**CRITICAL:** The \`#### Affected Files\` and \`## Affected Files\` sections MUST use \`- \\\`path/to/file\\\`\` syntax (backtick-quoted file paths as list items). This format is parsed by drift detection.

## Step 5: Write artifact

- Create the directory \`.branchos/workstreams/<id>/phases/<n>/\` if it does not exist.
- Write the generated content to \`.branchos/workstreams/<id>/phases/<n>/plan.md\`.

## Step 6: Update state.json

Read and update the workstream's \`state.json\`:

- If the target phase does not exist in the \`phases\` array, add a new phase object.
- Set the plan step to:
  \`\`\`json
  {
    "status": "complete",
    "createdAt": "<ISO 8601 timestamp>",
    "updatedAt": "<ISO 8601 timestamp>"
  }
  \`\`\`
- Store \`planBaseline\` on the phase object by running \`git rev-parse HEAD\` and saving the hash.
- Set \`currentPhase\` to this phase number.
- Write the updated state back to \`state.json\`.

## Step 7: Update decisions log

If any decisions were made during planning, append each to \`.branchos/workstreams/<id>/decisions.md\` using the format:

\`\`\`markdown
### <title>

**Phase:** <n>
**Context:** <why this decision was needed>
**Decision:** <what was chosen>
**Alternatives considered:**
- <alternative 1>
- <alternative 2>

---
\`\`\`

If \`decisions.md\` does not exist, create it with a \`# Decisions\` header first.

## Step 8: Auto-commit

Stage and commit all changed files:

\`\`\`bash
git add .branchos/workstreams/<id>/phases/<n>/plan.md .branchos/workstreams/<id>/state.json .branchos/workstreams/<id>/decisions.md
git commit -m "chore(branchos): plan phase <n> for <workstream-id>"
\`\`\`

$ARGUMENTS`,

  'branchos:execute-phase.md': `---
description: Update execution state for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

> **Tip:** Run \`/context\` first to load full workstream context for this session.

# Execute Phase

Update the execution state for the current workstream phase.

## Step 1: Resolve workstream and phase

1. Run \`git branch --show-current\` to get the current branch name.
2. Scan \`.branchos/workstreams/*/meta.json\` to find the workstream whose \`branch\` field matches the current branch.
3. If no matching workstream is found, stop with: "No workstream found for branch '<branch>'. Run \\\`branchos workstream create\\\` first."
4. Read the workstream's \`state.json\` via \`.branchos/workstreams/<id>/state.json\`.

**Determine target phase:**
- If \`$ARGUMENTS\` contains a number, use that as the target phase number.
- Otherwise, if \`currentPhase > 0\`, use \`currentPhase\`.
- Otherwise, stop with: "No active phase found. Run /discuss-phase or /plan-phase first."

## Step 2: Check for plan.md

Check if \`.branchos/workstreams/<id>/phases/<n>/plan.md\` exists.

If it does NOT exist, print warning: "No plan.md found for phase <n>. Execution tracking will be limited without a plan." Continue anyway.

## Step 3: Gather context

- Read \`plan.md\` for this phase to understand the planned tasks.
- Read existing \`execute.md\` if present (update rather than overwrite).
- Check git history since \`planBaseline\` (if set on the phase) to determine what work has been done.
- Inspect the actual file state of files listed in the plan's Affected Files section.

## Step 4: Generate or update execute.md

Assess each task from \`plan.md\` based on git history and file state. Generate/update \`execute.md\` with the following structure:

\`\`\`markdown
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
\`\`\`

If an existing \`execute.md\` is found, merge new information rather than discarding previous tracking data.

## Step 5: Write artifact

- Create the directory \`.branchos/workstreams/<id>/phases/<n>/\` if it does not exist.
- Write the generated content to \`.branchos/workstreams/<id>/phases/<n>/execute.md\`.

## Step 6: Update state.json

Read and update the workstream's \`state.json\`:

- Set the execute step status:
  - \`"in-progress"\` if some tasks are complete but not all
  - \`"complete"\` if all tasks from the plan are complete
- Set \`updatedAt\` to the current ISO 8601 timestamp.
- If \`createdAt\` is not set on the execute step, set it now.
- If ALL tasks are complete, also set the phase's \`status\` to \`"completed"\`.
- Write the updated state back to \`state.json\`.

## Step 7: Auto-commit

Stage and commit all changed files:

\`\`\`bash
git add .branchos/workstreams/<id>/phases/<n>/execute.md .branchos/workstreams/<id>/state.json
git commit -m "chore(branchos): execute phase <n> for <workstream-id>"
\`\`\`

$ARGUMENTS`,

  'branchos:ingest-prfaq.md': `---
description: Ingest PR-FAQ document for project planning
allowed-tools: Bash(npx branchos ingest-prfaq *)
---

# Ingest PR-FAQ

Ingest the PR-FAQ document from \`./PR-FAQ.md\` into BranchOS for project planning.

\`\`\`bash
npx branchos ingest-prfaq $ARGUMENTS
\`\`\`

This command reads PR-FAQ.md from your repository root, validates its structure,
and stores it in \`.branchos/shared/\` with change detection metadata.

Options:
- \`--force\`: Skip confirmation prompt if document doesn't look like a standard PR-FAQ
- \`--json\`: Output in machine-readable JSON format

$ARGUMENTS`,

  'branchos:plan-roadmap.md': `---
description: Generate roadmap and feature files from ingested PR-FAQ
allowed-tools: Read, Write, Bash(npx branchos *), Bash(git *)
---

# Plan Roadmap

Generate a roadmap with milestones and feature files from the ingested PR-FAQ.

## Step 1: Read PR-FAQ

Read \`.branchos/shared/PR-FAQ.md\`. If it does not exist, tell the user to run \`/branchos:ingest-prfaq\` first.

## Step 2: Infer milestones and features

Analyze the PR-FAQ content and create a structured roadmap:

1. **Milestones** -- Group related work into sequential milestones (M1, M2, etc.)
2. **Features** -- Break each milestone into fine-grained, workstream-sized features

For each feature, determine:
- **id**: Sequential F-001, F-002, etc.
- **title**: Short descriptive name
- **milestone**: Which milestone it belongs to (M1, M2, etc.)
- **branch**: \`feature/<slug>\` format (lowercase, hyphens, max 50 chars)
- **dependsOn**: Array of feature IDs this depends on (or omit if none)
- **Acceptance criteria**: Checklist items for what "done" means

## Step 3: Write files directly

Write the following files using the Write tool:

### ROADMAP.md at \`.branchos/shared/ROADMAP.md\`

Use this format:
\\\`\\\`\\\`markdown
# Roadmap: <Project Name>

> <Vision statement from PR-FAQ>

**Milestones:** N | **Features:** N

---

## M1: <Name> (0/N features complete)

| # | Feature | Status | Depends On |
|---|---------|--------|------------|
| F-001 | <title> | unassigned | -- |
| F-002 | <title> | unassigned | F-001 |
\\\`\\\`\\\`

### Feature files at \`.branchos/shared/features/F-NNN-<slug>.md\`

Each feature file uses YAML frontmatter:
\\\`\\\`\\\`markdown
---
id: F-001
title: <Feature title>
status: unassigned
milestone: M1
branch: feature/<slug>
issue: null
---

## Acceptance Criteria

- [ ] <criterion 1>
- [ ] <criterion 2>
\\\`\\\`\\\`

## Step 4: Commit

Run the commit command:

\\\`\\\`\\\`bash
npx branchos plan-roadmap --force
\\\`\\\`\\\`

Or if this is the first time: \`npx branchos plan-roadmap\`

This validates preconditions and auto-commits the generated files.

## Rules

- Feature IDs are sequential: F-001, F-002, F-003, etc.
- Branch names use \`feature/<slug>\` format
- Features should be workstream-sized (1-3 sessions of work)
- All features start with status \`unassigned\`
- Keep features fine-grained -- prefer more small features over fewer large ones

$ARGUMENTS`,

  'branchos:features.md': `---
description: List features or view feature details from the feature registry
allowed-tools: Bash(npx branchos features *)
---

# Features

List and view features from the BranchOS feature registry.

\`\`\`bash
npx branchos features $ARGUMENTS
\`\`\`

Usage examples:
- \`/branchos:features\` -- List all features in a table
- \`/branchos:features F-001\` -- View details for feature F-001
- \`/branchos:features --status unassigned\` -- Filter by status
- \`/branchos:features --milestone M1\` -- Filter by milestone
- \`/branchos:features --json\` -- Output as JSON

$ARGUMENTS`,
};

export function registerInstallCommandsCommand(program: Command): void {
  program
    .command('install-commands')
    .description('Install branchos slash commands for Claude Code')
    .option('--uninstall', 'Remove installed slash commands')
    .action((options: { uninstall?: boolean }) => {
      const targetDir = path.join(os.homedir(), '.claude', 'commands');

      if (options.uninstall) {
        let removed = 0;
        for (const filename of Object.keys(COMMANDS)) {
          const target = path.join(targetDir, filename);
          if (fs.existsSync(target)) {
            fs.unlinkSync(target);
            console.log(`  Removed ${filename}`);
            removed++;
          }
        }
        if (removed === 0) {
          console.log('No branchos commands found to remove.');
        } else {
          console.log(`\n✓ Removed ${removed} branchos slash commands.`);
        }
        return;
      }

      fs.mkdirSync(targetDir, { recursive: true });

      let installed = 0;
      for (const [filename, content] of Object.entries(COMMANDS)) {
        const target = path.join(targetDir, filename);
        fs.writeFileSync(target, content, 'utf-8');
        console.log(`  Installed /${filename.replace('.md', '')}`);
        installed++;
      }

      console.log(`\n✓ Installed ${installed} slash commands to ${targetDir}`);
      console.log('  Restart Claude Code to use them.');
    });
}
