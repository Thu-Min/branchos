# BranchOS v2 Vision: Project-Level Planning & Team Workflow

## The Shift

v1 solved: **isolated workstreams** (branch-scoped state for concurrent AI-assisted dev).

v2 solves: **project-level planning before workstreams** — defining what to build, breaking it into features, and coordinating who does what.

## New Workflow (End-to-End)

```
┌─────────────────────────────────────────────────────────┐
│ PROJECT-LEVEL (new in v2)                               │
│                                                         │
│  1. branchos init + map-codebase                        │
│     → architecture, conventions, stack, concerns,       │
│       integrations, structure                           │
│                                                         │
│  2. branchos discuss-project                            │
│     → PR-FAQ.md (press release + FAQ format)            │
│     → Defines what this project does & why              │
│                                                         │
│  3. branchos plan-roadmap                               │
│     → ROADMAP.md with milestones                        │
│     → FEATURES.md with feature list + branch names      │
│     → Acceptance criteria per feature (for QA/testers)  │
│                                                         │
│  4. Team reviews generated artifacts                    │
│     → Approve/modify roadmap, features, milestones      │
│                                                         │
│  5. branchos assign <feature> --issue #N                │
│     → Links feature to GitHub Issue                     │
│     → Developer self-assigns on GitHub                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ WORKSTREAM-LEVEL (existing v1, enhanced)                │
│                                                         │
│  6. branchos workstream create --feature <feature-id>   │
│     → Pre-populated with feature context, acceptance    │
│       criteria, and linked GitHub Issue                 │
│                                                         │
│  7. discuss → plan → execute (per feature)              │
│     → Same v1 workflow, now with richer context from    │
│       project-level planning                            │
│                                                         │
│  8. Repeat per milestone                                │
│     → Complete features → close milestone → next        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## New Concepts

### PR-FAQ (Press Release + FAQ)
Amazon-style product definition document. Generated through guided discussion.
- **Press Release**: What the product does, who it's for, why it matters
- **Customer FAQ**: Questions end-users would ask
- **Internal FAQ**: Technical questions the team needs answered
- Lives at: `.branchos/shared/PR-FAQ.md`

### Roadmap
Generated from PR-FAQ, contains:
- **Milestones**: Ordered delivery chunks (e.g., "M1: Core API", "M2: Dashboard")
- **Features**: Concrete units of work within milestones
- **Branch names**: Suggested `feature/<name>` for each feature
- **Dependencies**: Which features depend on others
- Lives at: `.branchos/shared/ROADMAP.md`

### Feature Registry
Each feature has:
- ID, title, description
- Milestone assignment
- Suggested branch name
- Acceptance criteria (for manual testers)
- GitHub Issue number (after linking)
- Status: unassigned → assigned → in-progress → complete
- Lives at: `.branchos/shared/features/<feature-id>.md`

### GitHub Issues Integration
- `branchos sync-issues` generates GitHub Issues from feature registry
- Each issue includes: description, acceptance criteria, milestone label
- Assignment happens on GitHub (not in branchos)
- `branchos workstream create --issue #N` links workstream to issue
- Workstream progress can optionally comment on the issue

## New Commands

| Command | Purpose |
|---------|---------|
| `branchos discuss-project` | Guided PR-FAQ creation through discussion |
| `branchos plan-roadmap` | Generate roadmap, features, milestones from PR-FAQ |
| `branchos features` | List all features with status and assignments |
| `branchos feature <id>` | Show feature detail (criteria, branch, issue) |
| `branchos sync-issues` | Create/update GitHub Issues from feature registry |
| `branchos workstream create --feature <id>` | Create workstream pre-loaded with feature context |

## New Slash Commands

| Slash Command | Purpose |
|---------------|---------|
| `/branchos:discuss-project` | AI-guided PR-FAQ session |
| `/branchos:plan-roadmap` | AI generates roadmap from PR-FAQ |
| `/branchos:review-roadmap` | AI helps review/refine roadmap |

## Directory Structure Changes

```
.branchos/
  shared/
    codebase/              # existing - map-codebase output
      ARCHITECTURE.md
      CONVENTIONS.md
      STACK.md
      CONCERNS.md
      INTEGRATIONS.md
      STRUCTURE.md
    PR-FAQ.md              # NEW - project definition
    ROADMAP.md             # NEW - milestones + feature breakdown
    features/              # NEW - feature registry
      auth-system.md
      payment-flow.md
      dashboard-ui.md
      ...
  workstreams/             # existing - per-branch state
    auth-system/
      meta.json            # enhanced: links to feature + issue
      ...
```

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| PR-FAQ format for project definition | Proven format (Amazon), forces clarity on customer value before implementation |
| GitHub Issues for assignment | Don't rebuild what exists; GitHub has assignment, labels, boards, discussion |
| Feature registry as markdown files | Human-readable, git-committed, reviewable in PRs |
| Features generate workstream context | Eliminates cold-start for discuss phase — context already exists |
| Acceptance criteria in feature files | QA/testers can review without understanding the codebase |
| Branch names in feature registry | Team consistency, no bikeshedding on naming |

## What Stays the Same

- Two-layer state model (shared + workstream)
- Workstream lifecycle (discuss → plan → execute)
- Branch-scoped isolation
- File-level conflict detection
- Context packet assembly
- Codebase mapping
- All artifacts committed to git

## What Changes

- New project-level layer sits ABOVE workstreams
- `init` flow expanded: map-codebase → discuss-project → plan-roadmap
- Workstream creation can be feature-aware (richer initial context)
- GitHub Issues become the assignment/tracking layer
- Acceptance criteria are first-class artifacts

## Implementation Priority

1. **PR-FAQ workflow** (discuss-project command + slash command)
2. **Roadmap generation** (plan-roadmap from PR-FAQ)
3. **Feature registry** (feature files with acceptance criteria)
4. **GitHub Issues sync** (create issues from features)
5. **Feature-aware workstream creation** (--feature flag)
6. **Enhanced context assembly** (include feature context in packets)
