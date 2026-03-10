---
description: Generate roadmap and feature files from ingested PR-FAQ
allowed-tools: Read, Write, Bash(npx branchos *), Bash(git *)
---

# Plan Roadmap

Generate a roadmap with milestones and feature files from the ingested PR-FAQ.

## Step 1: Read PR-FAQ

Read `.branchos/shared/PR-FAQ.md`. If it does not exist, tell the user to run `/branchos:ingest-prfaq` first.

## Step 2: Infer milestones and features

Analyze the PR-FAQ content and create a structured roadmap:

1. **Milestones** -- Group related work into sequential milestones (M1, M2, etc.)
2. **Features** -- Break each milestone into fine-grained, workstream-sized features

For each feature, determine:
- **id**: Sequential F-001, F-002, etc.
- **title**: Short descriptive name
- **milestone**: Which milestone it belongs to (M1, M2, etc.)
- **branch**: `feature/<slug>` format (lowercase, hyphens, max 50 chars)
- **dependsOn**: Array of feature IDs this depends on (or omit if none)
- **Acceptance criteria**: Checklist items for what "done" means

## Step 3: Write files directly

Write the following files using the Write tool:

### ROADMAP.md at `.branchos/shared/ROADMAP.md`

Use this format:
\`\`\`markdown
# Roadmap: <Project Name>

> <Vision statement from PR-FAQ>

**Milestones:** N | **Features:** N

---

## M1: <Name> (0/N features complete)

| # | Feature | Status | Depends On |
|---|---------|--------|------------|
| F-001 | <title> | unassigned | -- |
| F-002 | <title> | unassigned | F-001 |
\`\`\`

### Feature files at `.branchos/shared/features/F-NNN-<slug>.md`

Each feature file uses YAML frontmatter:
\`\`\`markdown
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
\`\`\`

## Step 4: Commit

Run the commit command:

\`\`\`bash
npx branchos plan-roadmap --force
\`\`\`

Or if this is the first time: `npx branchos plan-roadmap`

This validates preconditions and auto-commits the generated files.

## Rules

- Feature IDs are sequential: F-001, F-002, F-003, etc.
- Branch names use `feature/<slug>` format
- Features should be workstream-sized (1-3 sessions of work)
- All features start with status `unassigned`
- Keep features fine-grained -- prefer more small features over fewer large ones

$ARGUMENTS