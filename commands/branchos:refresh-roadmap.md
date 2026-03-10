---
description: Refresh roadmap and features when the PR-FAQ has been updated
allowed-tools: Read, Write, Bash(npx branchos *), Bash(git *)
---

# Refresh Roadmap

Refresh the roadmap and feature files after the PR-FAQ has been updated.

This command preserves existing feature IDs, statuses, issue numbers, and workstream links.
Features no longer present in the PR-FAQ get status \`dropped\`.

## Step 1: Read updated PR-FAQ

Read \`PR-FAQ.md\` from the repository root. If it does not exist, tell the user to create or update their PR-FAQ first.

## Step 2: Read existing features

Read existing features from \`.branchos/shared/features/\` to understand the current state.

## Step 3: Generate new RoadmapData

Analyze the updated PR-FAQ and create a \`RoadmapData\` structure (same format as plan-roadmap):
- Milestones with \`id\`, \`name\`
- Features with \`id\`, \`title\`, \`status\`, \`milestone\`, \`branch\`, \`issue\`, \`body\`, \`filename\`
- Use sequential IDs (F-001, F-002, etc.) -- the CLI will remap them based on matching

## Step 4: Run refresh command

\`\`\`bash
npx branchos refresh-roadmap $ARGUMENTS
\`\`\`

The command will:
1. Match new features to existing ones by title similarity
2. Preserve existing IDs, statuses, issue numbers, and workstream links on matched features
3. Update body/acceptance criteria from the new PR-FAQ
4. Mark features no longer present as \`dropped\`
5. Assign new sequential IDs to genuinely new features
6. Show a summary and ask for confirmation
7. Re-ingest the PR-FAQ (update stored copy and hash)

## Options

- \`--force\`: Skip confirmation prompt
- \`--json\`: Output structured JSON result

$ARGUMENTS