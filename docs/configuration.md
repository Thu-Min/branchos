# Configuration

BranchOS configuration is stored in `.branchos/config.json` at the repository root.

## Default Configuration

After running `branchos init`, the config file is created with these defaults:

```json
{
  "schemaVersion": 2
}
```

The `map` field is added automatically when you first run `/branchos:map-codebase`:

```json
{
  "schemaVersion": 2,
  "map": {
    "excludes": [
      "node_modules",
      "dist",
      "build",
      ".branchos",
      ".git",
      "*.lock",
      "*.min.*"
    ],
    "stalenessThreshold": 20
  }
}
```

## Configuration Fields

### `map.excludes`

An array of glob patterns to skip during codebase map generation. Add patterns for directories or files that don't need to be analyzed.

**Default:** `["node_modules", "dist", "build", ".branchos", ".git", "*.lock", "*.min.*"]`

**Example** - adding additional excludes:
```json
{
  "map": {
    "excludes": [
      "node_modules",
      "dist",
      "build",
      ".branchos",
      ".git",
      "*.lock",
      "*.min.*",
      "coverage",
      "*.generated.*",
      "vendor"
    ]
  }
}
```

### `map.stalenessThreshold`

Number of commits after which the codebase map is considered stale. When running `branchos map-status`, if the map is behind by more than this many commits, a warning is displayed.

**Default:** `20`

**Example** - setting a stricter threshold:
```json
{
  "map": {
    "stalenessThreshold": 10
  }
}
```

## Directory Structure

### Committed to Git

```
.branchos/
├── config.json                    # This configuration file
├── shared/
│   └── codebase/                  # Shared codebase map
│       ├── ARCHITECTURE.md
│       ├── MODULES.md
│       ├── CONVENTIONS.md
│       ├── STACK.md
│       └── CONCERNS.md
└── workstreams/
    └── <workstream-id>/
        ├── meta.json              # Workstream metadata
        ├── state.json             # Phase progress tracking
        ├── decisions.md           # Accumulated decisions
        └── phases/
            └── <n>/
                ├── discuss.md     # Discussion context
                ├── plan.md        # Implementation plan
                └── execute.md     # Execution tracking
```

### Ignored by Git

```
.branchos-runtime/
├── cache/
├── temp/
└── snapshots/
```

The `.branchos-runtime/` directory is automatically added to `.gitignore` during initialization. It stores temporary data that should not be shared across machines.

## Protected Branches

The following branches cannot have workstreams created on them:

- `main`
- `master`
- `develop`

This is a built-in safety measure and is not configurable.

## Schema Migrations

BranchOS automatically migrates state files when the schema version changes:

| Version | Changes |
|---------|---------|
| 0 → 1 | Added `schemaVersion` field |
| 1 → 2 | Added `currentPhase` and `phases` array |
| 2 → 3 | Added `assignee` and `issueNumber` fields |

Migrations run automatically when reading state files, so upgrading BranchOS is safe without manual intervention.
