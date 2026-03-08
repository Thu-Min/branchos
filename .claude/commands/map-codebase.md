---
description: Generate or refresh the codebase map in .branchos/shared/codebase/
allowed-tools: Read, Glob, Grep, Write, Bash(git rev-parse HEAD), Bash(git add *), Bash(git commit *)
---

# Codebase Map Generation

Generate or refresh the codebase map files in `.branchos/shared/codebase/`.

## Step 1: Read configuration

Read `.branchos/config.json`. If the `map` field does not exist, or if `map.excludes` is missing, update `config.json` to add default excludes:

```json
{
  "map": {
    "excludes": ["node_modules", "dist", "build", ".branchos", ".git", "*.lock", "*.min.*"],
    "stalenessThreshold": 20
  }
}
```

If `map.stalenessThreshold` does not exist, set it to `20`. Preserve all other existing config fields.

## Step 2: Get current commit hash

Run `git rev-parse HEAD` to get the current commit hash. Store it for use in the metadata headers.

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

List each dependency from `package.json` with its purpose and role in the project.

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

Write each of the 5 files to `.branchos/shared/codebase/`. Create the directory if it does not exist.

Each file MUST start with this metadata header (YAML frontmatter):

```
---
generated: <ISO 8601 timestamp, e.g. 2026-03-08T04:00:00Z>
commit: <HEAD hash from step 2>
generator: branchos/map-codebase
---
```

The 5 files to write:
- `.branchos/shared/codebase/ARCHITECTURE.md`
- `.branchos/shared/codebase/MODULES.md`
- `.branchos/shared/codebase/CONVENTIONS.md`
- `.branchos/shared/codebase/STACK.md`
- `.branchos/shared/codebase/CONCERNS.md`

## Step 5: Auto-commit

Stage and commit the generated files:

```bash
git add .branchos/shared/codebase/ARCHITECTURE.md .branchos/shared/codebase/MODULES.md .branchos/shared/codebase/CONVENTIONS.md .branchos/shared/codebase/STACK.md .branchos/shared/codebase/CONCERNS.md .branchos/config.json
git commit -m "chore(branchos): refresh codebase map"
```

$ARGUMENTS
