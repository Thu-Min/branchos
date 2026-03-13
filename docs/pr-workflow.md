# PR Workflow

BranchOS v2.2 provides an end-to-end developer loop: **Issue → Workstream → Code → PR**. This guide covers issue-linked workstreams, structured acceptance criteria, assignee tracking, and automated PR creation.

## Overview

```
GitHub Issue ──► Workstream ──► Phases ──► PR
     │               │                     │
     │          assignee captured      GWT criteria
     │               │                formatted in body
     └───────── feature matched ──────────┘
```

## Issue-Linked Workstreams

Create a workstream directly from a GitHub Issue:

```bash
git checkout -b feature/rate-limiting
```

```
/branchos:create-workstream --issue #42
```

**What happens:**
1. BranchOS fetches issue #42 via `gh issue view`
2. Matches the issue to a feature in the registry (by issue number or title similarity)
3. Creates the workstream with the feature pre-linked
4. Writes an `issue.md` file in the workstream directory with issue metadata
5. Captures your GitHub username as the workstream assignee

This is equivalent to `--feature <id>` but lets you start from the issue tracker instead of the feature registry.

## Assignee Capture

When you create a workstream, BranchOS automatically captures your GitHub identity by calling `gh api /user`. This is stored in the workstream's `meta.json`:

```json
{
  "assignee": "your-github-username",
  "issueNumber": 42
}
```

The assignee is used for:
- **Issue assignment** — `sync-issues` propagates your username to the linked GitHub Issue
- **PR assignment** — `create-pr` assigns the PR to you

If `gh` is not available or not authenticated, the assignee is set to `null` and these features degrade gracefully.

## GWT Acceptance Criteria

Features can define acceptance criteria in Given/When/Then format:

```markdown
## Acceptance Criteria

### AC-1
- Given a user is authenticated
- When they request /api/data with a valid token
- Then they receive a 200 response with the data

### AC-2
- Given a user is not authenticated
- When they request /api/data without a token
- Then they receive a 401 response
```

BranchOS parses these blocks and formats them as checklists in PR bodies:

```markdown
- [ ] **AC-1**
  - Given a user is authenticated
  - When they request /api/data with a valid token
  - Then they receive a 200 response with the data
- [ ] **AC-2**
  - Given a user is not authenticated
  - When they request /api/data without a token
  - Then they receive a 401 response
```

The `And` keyword is also supported and inherits the preceding keyword's type.

Freeform checklist items (`- [ ] description`) in the acceptance criteria section are preserved as-is.

## Creating a PR

When your implementation is complete:

```
/branchos:create-pr
```

Or from the terminal:

```bash
branchos create-pr
```

**What it does:**
1. Resolves the current workstream and its linked feature
2. Parses GWT acceptance criteria from the feature body
3. Assembles a PR body with:
   - Feature description
   - GWT-formatted acceptance criteria checklist
4. Determines the assignee from workstream metadata
5. Pushes the branch to remote if needed
6. Creates the PR via `gh pr create`
7. Returns the PR URL

**Options:**
| Flag | Description |
|------|-------------|
| `--dry-run` | Preview the PR without creating it |
| `--json` | Output result as JSON |
| `--cwd <path>` | Override working directory |

## Assignee Propagation

When running `/branchos:sync-issues`, BranchOS checks each feature's linked workstreams for an assignee. If found, it automatically runs:

```
gh issue edit <N> --add-assignee <username>
```

This keeps GitHub Issues in sync with who is actually working on each feature.

## Full Workflow Example

```
# 1. Sync features to GitHub Issues
/branchos:sync-issues

# 2. Pick an issue and create a linked workstream
/branchos:create-workstream --issue #42

# 3. Work through phases
/branchos:discuss-phase Implement rate limiting
/branchos:plan-phase
# ... implement ...
/branchos:execute-phase

# 4. Create a PR with full context
/branchos:create-pr
```
