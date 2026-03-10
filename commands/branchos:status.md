---
description: Show BranchOS dashboard with workstream status, map staleness, drift, and conflicts
allowed-tools: Bash(npx branchos *)
---

# BranchOS Status Dashboard

Show a consolidated dashboard with workstream status, codebase map staleness, drift detection, and conflict analysis.

Run all four status commands and present results as a unified dashboard:

```bash
npx branchos status --json
npx branchos map-status --json
npx branchos check-drift --json
npx branchos detect-conflicts --all --json
```

## Dashboard Sections

### 1. Workstream Status
Overall workstream summary from `npx branchos status --json`.

### 2. Codebase Map Staleness
How fresh the codebase map is from `npx branchos map-status --json`. If stale, suggest running `/branchos:map-codebase`.

### 3. Drift Detection
Files that have drifted from plan baselines from `npx branchos check-drift --json`. Highlight any unplanned changes.

### 4. Conflict Analysis
Potential file conflicts across workstreams from `npx branchos detect-conflicts --all --json`. Flag any overlapping file modifications.

## Presentation

Present the results as a unified dashboard with clear section headers. Use tables and bullet points for readability. Highlight any items that need attention (stale maps, significant drift, conflicts).

$ARGUMENTS
