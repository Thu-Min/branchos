# Conflict Detection

BranchOS provides early detection of file-level conflicts between active workstreams, helping teams avoid merge pain before it happens.

## The Problem

When multiple developers (or AI agents) work on different branches simultaneously, they may unknowingly modify the same files. These overlaps only surface during merge, often leading to complex conflicts that are time-consuming to resolve.

## How It Works

BranchOS tracks which files each workstream plans to modify (from `plan.md`) and which files have actually been changed (from git history). It cross-references these across all active workstreams to identify overlaps.

### Running Conflict Detection

```bash
branchos detect-conflicts
```

Include archived workstreams:
```bash
branchos detect-conflicts --all
```

### Severity Levels

| Severity | Condition | Risk |
|----------|-----------|------|
| **High** | Both workstreams have already changed the same file | Merge conflict is likely |
| **Medium** | One planned + one changed, or both planned the same file | Potential future conflict |

### Example Output

```
Conflicts detected:

  HIGH  src/auth/middleware.ts
        ├── payment-retry (changed)
        └── auth-refactor (changed)

  MEDIUM  src/utils/validation.ts
          ├── payment-retry (planned)
          └── auth-refactor (changed)
```

## How Files Are Tracked

BranchOS builds a file map from two sources per workstream:

1. **Planned files** - Parsed from backtick-quoted list items in `plan.md`:
   ```markdown
   ## Affected Files
   - `src/auth/middleware.ts`
   - `src/utils/validation.ts`
   ```

2. **Changed files** - Actual files modified on the branch compared to the nearest protected branch (`main`, `master`, or `develop`).

Changed files take priority over planned files for the same workstream (since actual changes are more definitive than plans).

## Drift Detection

Drift detection is a related but per-workstream tool. It compares one workstream's plan against its own actual changes:

```bash
branchos check-drift
```

Output categories:
- **Planned and changed** (on track) - Files that were planned and have been modified
- **Planned but not changed** (incomplete) - Files in the plan that haven't been touched yet
- **Changed but not planned** (unplanned) - Files modified that weren't in the plan

Specify a phase:
```bash
branchos check-drift --phase 2
```

## Best Practices

1. **Run `detect-conflicts` regularly** - Especially before starting a new phase or when you know other workstreams are active.

2. **Use drift detection during execution** - Run `check-drift` to verify you're staying on track with your plan.

3. **Refresh the codebase map** - Run `/branchos:map-codebase` periodically so conflict detection has accurate architectural context.

4. **Communicate early** - When conflicts are detected at medium severity, coordinate with the other developer before the conflict becomes high severity.
