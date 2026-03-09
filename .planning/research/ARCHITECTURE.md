# Architecture Research

**Domain:** CLI-first project planning layer for AI-assisted development tool
**Researched:** 2026-03-09
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Slash Commands (Claude Code)                  │
│  /branchos:discuss-project  /branchos:plan-roadmap              │
│  /branchos:sync-issues      /branchos:refresh-roadmap           │
│  /branchos:context  /branchos:discuss-phase  (existing)         │
├─────────────────────────────────────────────────────────────────┤
│                    CLI Bootstrapper (Commander)                  │
│  branchos init | install-commands | context | features          │
├───────────┬─────────────┬──────────────┬────────────────────────┤
│  Project  │  Feature    │  GitHub      │  Context               │
│  Layer    │  Registry   │  Issues      │  Assembly              │
│  (NEW)    │  (NEW)      │  Sync (NEW)  │  (ENHANCED)            │
├───────────┴─────────────┴──────────────┴────────────────────────┤
│                    State Layer                                   │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ Shared State   │  │ Workstream   │  │ Config           │     │
│  │ PR-FAQ.md      │  │ State        │  │ config.json      │     │
│  │ ROADMAP.md     │  │ meta.json    │  │                  │     │
│  │ features/*.md  │  │ state.json   │  │                  │     │
│  │ codebase/*     │  │ phases/*     │  │                  │     │
│  └────────────────┘  └──────────────┘  └──────────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│                    Git Layer (simple-git)                        │
│  addAndCommit | getCurrentBranch | getDiff | getMergeBase        │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| Slash Commands | AI-driven workflow orchestration in Claude Code | Existing (5), new (4-5 needed) |
| CLI Bootstrapper | `init`, `install-commands`, data query commands (`features`, `context`) | Existing, shrinks in v2 |
| Project Layer | PR-FAQ ingestion, roadmap generation pipeline | NEW |
| Feature Registry | Feature CRUD, status lifecycle, acceptance criteria storage | NEW |
| GitHub Issues Sync | Create/update GitHub Issues from features via `gh` CLI | NEW |
| Context Assembly | Build context packets from shared + workstream + feature data | ENHANCED |
| State Layer | File-based JSON/Markdown persistence in `.branchos/` | Existing, extended |
| Git Layer | Branch ops, diffs, commits via simple-git | Existing, minor additions |

## How New Components Integrate with Existing Architecture

### Integration Principle: Extend, Don't Replace

The existing two-layer state model (shared + workstream) remains intact. The v2 features add new files to the shared layer and new fields to workstream metadata. No existing interfaces change shape -- they gain optional fields.

### Layer 1: Shared State Extensions

**Current shared state:** `.branchos/shared/codebase/*.md`

**New shared state:**

```
.branchos/shared/
  codebase/                    # EXISTING - untouched
    ARCHITECTURE.md
    CONVENTIONS.md
    MODULES.md
    STACK.md
    CONCERNS.md
  PR-FAQ.md                    # NEW - product definition document
  PR-FAQ.hash                  # NEW - hash of PR-FAQ.md for change detection
  ROADMAP.md                   # NEW - milestones + feature breakdown
  features/                    # NEW - feature registry
    <feature-id>.json          # Structured data (status, issue link, etc.)
    <feature-id>.md            # Human-readable spec + acceptance criteria
```

**Key decision: JSON + Markdown dual files for features.** Use `.json` for machine-readable state (status, issue number, milestone, branch name) and `.md` for human-readable content (description, acceptance criteria). The JSON is the source of truth for state; the Markdown is the source of truth for content. This avoids parsing Markdown for status queries while keeping specs human-reviewable in PRs.

### Layer 2: Workstream Meta Extensions

**Current `meta.json` (WorkstreamMeta interface in `src/state/meta.ts`):**
```json
{
  "schemaVersion": 2,
  "workstreamId": "auth-system",
  "branch": "feature/auth-system",
  "status": "active",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Enhanced `meta.json` (v2):**
```json
{
  "schemaVersion": 3,
  "workstreamId": "auth-system",
  "branch": "feature/auth-system",
  "status": "active",
  "createdAt": "...",
  "updatedAt": "...",
  "featureId": "auth-system",
  "issueNumber": 42
}
```

New fields are optional -- workstreams created without `--feature` still work exactly as before. Schema migration from v2 to v3 adds `featureId: null, issueNumber: null`.

## Recommended Project Structure

```
src/
├── cli/                       # EXISTING - Commander entry + subcommands
│   ├── index.ts               # Commander program setup
│   ├── init.ts                # branchos init
│   ├── install-commands.ts    # Slash command installer (MODIFIED: add new commands)
│   ├── context.ts             # branchos context (MODIFIED: feature data in packets)
│   ├── features.ts            # NEW: branchos features (list/show)
│   ├── workstream.ts          # MODIFIED: --feature and --issue flags
│   └── ...                    # Existing commands unchanged
├── context/
│   └── assemble.ts            # MODIFIED: add feature sections to packets
├── project/                   # NEW - project-level planning module
│   ├── pr-faq.ts              # PR-FAQ read/hash/change-detection
│   └── roadmap.ts             # Roadmap read/parse helpers
├── feature/                   # NEW - feature registry module
│   ├── registry.ts            # CRUD: create, read, list, update features
│   ├── lifecycle.ts           # Status transitions (unassigned -> assigned -> in-progress -> complete)
│   └── types.ts               # Feature interfaces
├── github/                    # NEW - GitHub integration module
│   └── issues.ts              # Create/update/link issues via gh CLI subprocess
├── git/
│   └── index.ts               # EXISTING - minor additions if needed
├── state/
│   ├── config.ts              # EXISTING - may add project-level config fields
│   ├── meta.ts                # MODIFIED: add featureId, issueNumber fields
│   ├── schema.ts              # MODIFIED: add v2->v3 migration
│   └── state.ts               # EXISTING - unchanged
├── map/                       # EXISTING - unchanged
├── phase/                     # EXISTING - unchanged
├── workstream/
│   ├── create.ts              # MODIFIED: accept featureId + issueNumber
│   └── ...                    # Existing files unchanged
├── constants.ts               # MODIFIED: add FEATURES_DIR, PR_FAQ_FILE, etc.
├── output/                    # EXISTING - unchanged
└── index.ts                   # EXISTING - unchanged
```

### Structure Rationale

- **`project/`:** Isolated module for project-level concerns (PR-FAQ, roadmap). These are shared-layer operations that don't touch workstreams.
- **`feature/`:** Separate from `project/` because features have their own lifecycle independent of roadmap generation. Roadmap creates features; features live independently after that.
- **`github/`:** Thin wrapper around `gh` CLI subprocess calls. Kept separate because it has an external dependency (gh CLI) and is the only module that makes network calls.
- **Slash commands stay in `install-commands.ts`:** The existing pattern of embedding slash command content as string constants in the `COMMANDS` map within `install-commands.ts` works and should continue for new commands.

## Architectural Patterns

### Pattern 1: Slash-Command-Driven Workflows (AI as Controller)

**What:** Slash commands contain detailed step-by-step instructions that Claude Code executes. The AI reads/writes `.branchos/` files directly. The CLI provides data query commands (`context`, `features`) but does NOT orchestrate workflows.

**When to use:** All project-level planning workflows (discuss-project, plan-roadmap, refresh-roadmap, sync-issues).

**Trade-offs:**
- Pro: Claude Code has full context, can make intelligent decisions, handles unstructured input (PR-FAQ discussion)
- Pro: No need to build complex CLI argument parsing for nuanced workflows
- Con: Behavior varies between Claude Code sessions (non-deterministic)
- Con: Harder to test programmatically

This is the established v1 pattern. The `branchos:discuss-phase.md` slash command is the template -- it gives Claude step-by-step instructions for reading state, generating artifacts, writing files, updating JSON, and committing. New v2 slash commands should follow the same structure.

### Pattern 2: JSON for State, Markdown for Content

**What:** Machine-readable state lives in `.json` files; human-readable content lives in `.md` files. Both are committed to git.

**When to use:** Any entity that needs both programmatic querying AND human review (features, workstream state).

**Trade-offs:**
- Pro: CLI can query feature status without parsing Markdown
- Pro: Feature specs are reviewable in GitHub PRs as plain Markdown
- Con: Two files per feature (manageable -- teams won't have 100+ features)

**Example:**
```
features/
  auth-system.json    # {"id":"auth-system","status":"assigned","milestone":"M1","issueNumber":42,"branch":"feature/auth-system"}
  auth-system.md      # ## Auth System\n### Description\n...\n### Acceptance Criteria\n- [ ] ...
```

### Pattern 3: Subprocess Shell-out for External Tools

**What:** GitHub operations use `child_process.execSync` to call `gh` CLI, NOT the GitHub REST API directly.

**When to use:** GitHub Issues sync.

**Trade-offs:**
- Pro: No OAuth token management, no API client dependency, no rate limit handling
- Pro: `gh` CLI handles auth (user already authenticated)
- Pro: Zero new npm dependencies
- Con: Requires `gh` CLI installed (acceptable -- Claude Code users likely have it)
- Con: Parsing CLI output is fragile (mitigate with `--json` flag on `gh`)

**Example:**
```typescript
import { execSync } from 'child_process';

export function createIssue(opts: {
  title: string;
  body: string;
  labels: string[];
  cwd: string;
}): number {
  const labelFlags = opts.labels.map(l => `--label "${l}"`).join(' ');
  const result = execSync(
    `gh issue create --title "${opts.title}" --body-file - ${labelFlags} --json number`,
    { input: opts.body, encoding: 'utf-8', cwd: opts.cwd }
  );
  return JSON.parse(result).number;
}
```

### Pattern 4: Hash-Based Change Detection for PR-FAQ Drift

**What:** Store a SHA-256 hash of `PR-FAQ.md` content in `PR-FAQ.hash`. When `refresh-roadmap` runs, compare current hash to stored hash to detect changes.

**When to use:** PR-FAQ change detection (explicit, not automatic -- per design decision).

**Trade-offs:**
- Pro: Simple, deterministic, no file-watching complexity
- Pro: Works across git branches and team members
- Con: Only detects changes when user explicitly runs refresh (by design)

```typescript
import { createHash } from 'crypto';

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}
```

## Data Flow

### PR-FAQ to Workstream Flow (End-to-End)

```
/branchos:discuss-project
    |
    +-- Reads: .branchos/shared/codebase/* (architecture context)
    +-- AI-guided discussion with user
    +-- Writes: .branchos/shared/PR-FAQ.md
                .branchos/shared/PR-FAQ.hash
    |
/branchos:plan-roadmap
    |
    +-- Reads: .branchos/shared/PR-FAQ.md
    +--         .branchos/shared/codebase/* (for technical feasibility)
    +-- AI generates roadmap + feature breakdown
    +-- Writes: .branchos/shared/ROADMAP.md
    +-- Writes: .branchos/shared/features/<id>.json  (per feature)
                .branchos/shared/features/<id>.md     (per feature)
    |
/branchos:sync-issues
    |
    +-- Reads: .branchos/shared/features/*.json (all features)
    +--         .branchos/shared/features/*.md   (for issue body)
    +-- Calls: gh issue create (per unsynced feature)
    +-- Updates: .branchos/shared/features/<id>.json  (adds issueNumber)
    |
branchos workstream create --feature auth-system
    |
    +-- Reads: .branchos/shared/features/auth-system.json
    +-- Creates: .branchos/workstreams/auth-system/meta.json
    |            (with featureId + issueNumber populated)
    +-- Creates: .branchos/workstreams/auth-system/state.json
    +-- Updates: .branchos/shared/features/auth-system.json
                 (status: "unassigned" -> "in-progress")
    |
/branchos:context
    |
    +-- Reads: existing context sources (codebase, phases, decisions)
    +-- Reads: .branchos/shared/features/<featureId>.md  (NEW)
    +-- Reads: .branchos/shared/ROADMAP.md               (NEW, for milestone context)
    +-- Outputs: enhanced context packet with feature section
```

### Roadmap Refresh Flow

```
User edits PR-FAQ.md (directly or via /branchos:discuss-project)
    |
/branchos:refresh-roadmap
    |
    +-- Reads: .branchos/shared/PR-FAQ.md
    +-- Reads: .branchos/shared/PR-FAQ.hash  (previous hash)
    +-- Computes: new hash
    +-- Compares: old hash vs new hash
    |   +-- SAME: "PR-FAQ unchanged. No refresh needed."
    |   +-- DIFFERENT:
    |       +-- Reads: existing ROADMAP.md + features/*.json
    |       +-- AI identifies what changed and proposes roadmap updates
    |       +-- Presents diff to user for approval
    |       +-- Updates: ROADMAP.md, features/*.json, features/*.md
    |       +-- Writes: new PR-FAQ.hash
    +-- Commits changes
```

### Context Assembly Enhancement

**Current `AssemblyInput` interface** (from `src/context/assemble.ts`) includes: workstreamId, branch, phaseNumber, stepStatuses, detectedStep, staleness, architecture, conventions, modules, discussMd, planMd, executeMd, decisions, branchDiffNameStatus, branchDiffStat.

**Enhanced `AssemblyInput` adds:**

```typescript
// New optional fields on AssemblyInput
featureSpec: string | null;        // Content of features/<id>.md
featureStatus: string | null;      // JSON stringified feature state
milestoneContext: string | null;    // Relevant milestone section from ROADMAP.md
acceptanceCriteria: string | null;  // Extracted from feature spec
```

**New sections in STEP_SECTIONS:**

```typescript
const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss: ['architecture', 'conventions', 'decisions', 'feature', 'branchDiff'],
  plan: ['discuss', 'modules', 'conventions', 'decisions', 'feature', 'branchDiff'],
  execute: ['plan', 'execute', 'branchDiff', 'decisions', 'acceptanceCriteria'],
  fallback: ['architecture', 'conventions', 'decisions', 'feature', 'branchDiff', 'hint'],
};
```

The `feature` section is only populated when the workstream has `featureId` set in its meta. Otherwise it is omitted (backwards compatible with v1 workstreams). The `acceptanceCriteria` section appears during execute to remind developers what "done" looks like.

**Key: the `contextHandler` in `src/cli/context.ts` gains new reads.** After resolving the workstream, if `meta.featureId` exists, it reads the feature spec and extracts acceptance criteria. This follows the existing pattern where `contextHandler` gathers all data and passes it to the pure `assembleContext` function.

## Key Integration Points

### Modifications to Existing Files

| Existing File | Change | Details |
|---------------|--------|---------|
| `src/constants.ts` | Add constants | `FEATURES_DIR = 'features'`, `PR_FAQ_FILE = 'PR-FAQ.md'`, `ROADMAP_FILE = 'ROADMAP.md'`, `PR_FAQ_HASH_FILE = 'PR-FAQ.hash'` |
| `src/state/meta.ts` | Extend `WorkstreamMeta` | Add optional `featureId?: string`, `issueNumber?: number` to interface; update `createMeta` to accept them |
| `src/state/schema.ts` | Add migration | `v2 -> v3` migration: bump version, add `featureId: null, issueNumber: null` when `workstreamId` present |
| `src/workstream/create.ts` | Accept new options | Add `featureId?: string`, `issueNumber?: number` to `createWorkstream` options; pass to `createMeta`; update feature status |
| `src/context/assemble.ts` | Extend `AssemblyInput` | Add `featureSpec`, `featureStatus`, `milestoneContext`, `acceptanceCriteria` fields; add `feature` and `acceptanceCriteria` to `STEP_SECTIONS`; add cases to `getSection` |
| `src/cli/context.ts` | Read feature data | When workstream meta has `featureId`, read `features/<id>.md` and `features/<id>.json`; pass into `AssemblyInput` |
| `src/cli/install-commands.ts` | Add new slash commands | 4-5 new command string entries in `COMMANDS` map |

### New Modules

| Module | Depends On | Depended By |
|--------|-----------|-------------|
| `src/feature/types.ts` | Nothing | `registry.ts`, `lifecycle.ts`, CLI, context |
| `src/feature/registry.ts` | `fs`, `types.ts`, `constants.ts` | CLI (`features` command), slash commands, `workstream/create.ts` |
| `src/feature/lifecycle.ts` | `types.ts`, `registry.ts` | Slash commands, `workstream/create.ts` |
| `src/project/pr-faq.ts` | `fs`, `crypto` | Slash commands (read/hash only) |
| `src/project/roadmap.ts` | `fs` | Slash commands (read/parse only) |
| `src/github/issues.ts` | `child_process` | Slash commands (sync-issues) |

### External Dependencies

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub Issues | `gh` CLI subprocess via `child_process.execSync` | Requires `gh` CLI installed and authenticated; use `--json` flag for structured output; fail gracefully if `gh` not found |
| Claude Code | Slash commands in `~/.claude/commands/` | AI executes instructions; reads/writes files directly |
| Git | `simple-git` library (existing) | No changes to git integration pattern |

## New Slash Commands Design

### `/branchos:discuss-project`

**Purpose:** AI-guided PR-FAQ creation
**Reads:** `.branchos/shared/codebase/*` (for technical context)
**Writes:** `.branchos/shared/PR-FAQ.md`, `.branchos/shared/PR-FAQ.hash`
**Tools needed:** `Read, Glob, Grep, Write, Bash(git *)`
**Pattern:** Interactive -- asks user questions, synthesizes answers into PR-FAQ format. Similar structure to `branchos:discuss-phase.md` but operates on shared state instead of workstream state.

### `/branchos:plan-roadmap`

**Purpose:** Generate roadmap and features from PR-FAQ
**Reads:** `.branchos/shared/PR-FAQ.md`, `.branchos/shared/codebase/*`
**Writes:** `.branchos/shared/ROADMAP.md`, `.branchos/shared/features/*.json`, `.branchos/shared/features/*.md`, `.branchos/shared/PR-FAQ.hash`
**Tools needed:** `Read, Write, Bash(git *)`
**Pattern:** Batch generation -- creates all feature files at once; creates feature IDs from titles (slugified, same logic as `slugifyBranch` in `src/workstream/resolve.ts`)

### `/branchos:refresh-roadmap`

**Purpose:** Update roadmap when PR-FAQ changes
**Reads:** `.branchos/shared/PR-FAQ.md`, `.branchos/shared/PR-FAQ.hash`, existing features
**Writes:** Updated ROADMAP.md, features, new hash
**Tools needed:** `Read, Write, Bash(git *)`
**Pattern:** Diff-based -- shows user what changed, proposes updates, waits for approval before writing. Must preserve feature status and issue links when updating.

### `/branchos:sync-issues`

**Purpose:** Create GitHub Issues from features
**Reads:** `.branchos/shared/features/*.json`, `.branchos/shared/features/*.md`
**Writes:** Updated `.json` files (adds issueNumber)
**Tools needed:** `Read, Write, Bash(gh issue *), Bash(git *)`
**Pattern:** Idempotent -- skips features that already have `issueNumber`; uses `gh` CLI with `--json` for structured output

### `/branchos:features` (or CLI command)

**Purpose:** List all features with status
**Implementation:** Best as a CLI command (`branchos features`) that the slash command calls via `npx branchos features`, mirroring how `/branchos:context` delegates to `npx branchos context`. Listing features is deterministic -- no AI judgment needed.

## Schema Migration Strategy

**Current schema version:** 2 (applies to both `meta.json` and `state.json` via shared `migrateIfNeeded`)

**New schema version:** 3

The existing migration system in `src/state/schema.ts` uses a chained approach (`v0 -> v1 -> v2`). Adding `v2 -> v3`:

```typescript
{
  fromVersion: 2,
  migrate: (data) => {
    const migrated = { ...data, schemaVersion: 3 };
    // Only add feature fields to meta.json (identified by workstreamId presence)
    if ('workstreamId' in data) {
      (migrated as Record<string, unknown>).featureId = null;
      (migrated as Record<string, unknown>).issueNumber = null;
    }
    return migrated;
  },
}
```

The existing chained migration pattern (`v0 -> v1 -> v2 -> v3`) handles all upgrade paths automatically. A workstream created in v1 hitting v3 code will migrate through `v0 -> v1 -> v2 -> v3` seamlessly. No data loss risk.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parsing Markdown for State

**What people do:** Store feature status inside the Markdown file (e.g., YAML frontmatter `status: assigned`) and parse it for queries.
**Why it's wrong:** Markdown parsing is fragile, error-prone, and couples human-readable format to machine operations. Frontmatter parsers add dependencies.
**Do this instead:** Separate JSON for state, Markdown for content. Two files per feature is a small cost for clean separation.

### Anti-Pattern 2: GitHub API Client Instead of gh CLI

**What people do:** Add `@octokit/rest` as a dependency, manage OAuth tokens, handle API pagination and rate limits.
**Why it's wrong:** Massive complexity increase for simple issue creation. OAuth flows don't fit CLI-first tools. Token storage is a security concern.
**Do this instead:** Shell out to `gh` CLI. Users already have it authenticated. Use `--json` output flag for structured parsing. Fail gracefully with a clear message if `gh` is not installed.

### Anti-Pattern 3: Auto-Detecting PR-FAQ Changes

**What people do:** Watch file system or check PR-FAQ hash on every command to auto-trigger roadmap refresh.
**Why it's wrong:** Unwanted side effects. PR-FAQ may be mid-edit. Team should consciously decide when to refresh.
**Do this instead:** Explicit `/branchos:refresh-roadmap` command. Store hash for comparison but only check it when user asks.

### Anti-Pattern 4: Storing Feature State in Workstream

**What people do:** Duplicate feature data into the workstream directory so it's "local."
**Why it's wrong:** Feature state must be shared across team members. Duplicating creates sync issues when multiple people reference the same feature.
**Do this instead:** Features live in shared state only (`.branchos/shared/features/`). Workstream `meta.json` has a `featureId` pointer. Context assembly reads the shared feature file at packet-build time.

### Anti-Pattern 5: Building a Feature Assignment System

**What people do:** Build assignment tracking, notification, ownership management inside the CLI.
**Why it's wrong:** Rebuilding GitHub. Assignment, labels, boards, discussions already exist on GitHub.
**Do this instead:** Sync features to GitHub Issues. Let GitHub handle assignment. Store only the issue number back in the feature JSON.

## Build Order (Dependency-Driven)

The following order respects dependencies -- each step builds on what came before:

| Order | Component | Depends On | Enables |
|-------|-----------|-----------|---------|
| 1 | Feature types + registry (`src/feature/`) | Nothing new | Everything else |
| 2 | Constants + schema migration v2->v3 | Feature types | Workstream meta changes |
| 3 | PR-FAQ module (`src/project/pr-faq.ts`) | Constants | Roadmap generation |
| 4 | `/branchos:discuss-project` slash command | PR-FAQ module | `/branchos:plan-roadmap` |
| 5 | Roadmap helpers (`src/project/roadmap.ts`) | Feature registry | Plan-roadmap command |
| 6 | `/branchos:plan-roadmap` slash command | PR-FAQ + feature registry + roadmap | Features exist for sync |
| 7 | GitHub issues module (`src/github/issues.ts`) | Feature registry | Issue sync command |
| 8 | `/branchos:sync-issues` slash command | GitHub module + feature registry | Issue linking |
| 9 | Enhanced workstream create (`--feature`, `--issue`) | Schema v3 + feature registry | Feature-aware workstreams |
| 10 | Enhanced context assembly | Feature registry + enhanced meta | Feature context in packets |
| 11 | `/branchos:refresh-roadmap` slash command | All above | Iterative planning |
| 12 | `branchos features` CLI command | Feature registry | Quick queries |
| 13 | Slash-command migration (move v1 CLI workflow commands) | All new commands stable | CLI simplification |

**Rationale:** Feature types/registry first because every other component references them. PR-FAQ before roadmap because roadmap consumes PR-FAQ. GitHub sync after features exist. Context assembly enhancement after everything else is in place because it depends on feature data being real. Slash-command migration is separate cleanup work that should happen last, after the new commands are proven stable.

## Sources

- Existing codebase analysis (HIGH confidence): `src/context/assemble.ts`, `src/state/meta.ts`, `src/state/schema.ts`, `src/cli/context.ts`, `src/cli/install-commands.ts`, `src/workstream/create.ts`
- Vision document (HIGH confidence): `.planning/v2-VISION.md`
- Project document (HIGH confidence): `.planning/PROJECT.md`
- Claude Code slash command pattern (HIGH confidence): `.claude/commands/branchos:*.md` (observed working pattern from v1)

---
*Architecture research for: BranchOS v2 project-level planning layer*
*Researched: 2026-03-09*
