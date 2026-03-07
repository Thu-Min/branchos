# Architecture Patterns

**Domain:** CLI developer workflow tool with file-based state, git integration, and Claude Code slash commands
**Researched:** 2026-03-07

## Recommended Architecture

BranchOS is a TypeScript CLI tool with three distinct runtime contexts:

1. **Direct CLI invocation** -- user runs `branchos <command>` in terminal
2. **Slash command invocation** -- Claude Code runs a `.claude/commands/branchos-*.md` command that shells out to `branchos` and consumes its stdout as context
3. **Git hook invocation** -- optional hooks for staleness detection and workstream prompts

All three converge on the same core library. The CLI is a thin shell; the real work happens in composable internal modules.

```
                         +-------------------+
                         |   Claude Code     |
                         |  slash commands   |
                         |  (.claude/cmds/)  |
                         +--------+----------+
                                  |
                                  | shells out to `branchos context-packet`
                                  v
+-------------+          +--------+----------+          +-----------+
|  Developer  | -------> |   CLI Entry       | -------> | Git Layer |
|  Terminal   |  branchos|   (bin/branchos)  |  spawn   | (git ops) |
+-------------+  <cmd>   +--------+----------+          +-----------+
                                  |
                         +--------+----------+
                         |   Command Router  |
                         |   (commander.js)  |
                         +--------+----------+
                                  |
                    +-------------+-------------+
                    |             |              |
              +-----+----+ +-----+-----+ +-----+------+
              |  State   | | Context   | | Workstream |
              |  Manager | | Assembler | | Lifecycle  |
              +-----+----+ +-----+-----+ +-----+------+
                    |             |              |
              +-----+--------------------------------------------+
              |              File System Layer                   |
              |  .branchos/shared/    .branchos/workstreams/<id>/|
              +--------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **CLI Entry** (`bin/branchos`) | Parse args, route to commands, handle errors/exit codes | Command Router |
| **Command Router** | Register commands via commander.js, validate args, dispatch | All command handlers |
| **State Manager** | Read/write `.branchos/` files, ensure directory structure, schema validation | File System, Git Layer |
| **Context Assembler** | Build context packets from shared + workstream + git state | State Manager, Git Layer |
| **Workstream Lifecycle** | Create, list, archive, resolve workstream ID from branch | State Manager, Git Layer |
| **Git Layer** | Current branch, diff summary, commit count since map, branch operations | External `git` binary |
| **Codebase Mapper** | Analyze repo structure, produce architecture/module/convention summaries | Git Layer, State Manager |
| **Conflict Detector** | Compare file lists across active workstreams for overlap | State Manager |
| **Slash Command Templates** | Markdown files in `.claude/commands/` that invoke `branchos` subcommands | CLI Entry (via shell) |

### Data Flow

**Context Assembly Flow (most critical path):**

```
1. Claude Code slash command fires
2. Shell exec: `branchos context-packet --phase discuss`
3. CLI resolves current branch via `git branch --show-current`
4. Workstream ID derived from branch name (or --name override)
5. State Manager loads:
   a. .branchos/shared/codebase-map.md
   b. .branchos/shared/conventions.md
   c. .branchos/workstreams/<id>/state.json
   d. .branchos/workstreams/<id>/phases/<N>/*.md
6. Git Layer provides:
   a. Branch diff summary (git diff main...HEAD --stat)
   b. Commit count since last map update
7. Context Assembler merges all into structured markdown
8. Output to stdout (Claude Code consumes this)
```

**Workstream Creation Flow:**

```
1. Developer runs `branchos workstream create` (or prompted on branch switch)
2. Git Layer resolves current branch name
3. Workstream ID = sanitized branch name (e.g., feature/auth -> feature-auth)
4. State Manager creates .branchos/workstreams/<id>/
5. State Manager writes initial state.json (phase: 0, status: active)
6. Developer sees confirmation with workstream ID
```

**Codebase Mapping Flow:**

```
1. Developer runs `branchos map-codebase`
2. Codebase Mapper scans repo structure (file tree, key files)
3. Output written to .branchos/shared/codebase-map.md
4. Git Layer records current HEAD commit hash in .branchos/shared/map-meta.json
5. All artifacts committed to git by developer
```

## Patterns to Follow

### Pattern 1: Layered State with Schema Validation

**What:** All state files use JSON with a versioned schema. Markdown artifacts are unstructured but referenced from JSON.

**When:** Always -- every read/write to `.branchos/` goes through State Manager.

**Why:** File-based state is fragile. Schema versioning enables migration as the tool evolves. Centralizing file access in State Manager prevents scattered fs calls.

```typescript
// state.json schema (versioned)
interface WorkstreamState {
  version: 1;
  id: string;
  branch: string;
  status: "active" | "paused" | "archived";
  currentPhase: number;
  phases: PhaseState[];
  createdAt: string;
  updatedAt: string;
}

interface PhaseState {
  index: number;
  name: string;
  status: "pending" | "discuss" | "plan" | "execute" | "complete";
  artifacts: string[]; // relative paths within workstream dir
}
```

### Pattern 2: Context Packet as Pure Function

**What:** Context assembly is a pure function: `(sharedState, workstreamState, gitState) => string`. No side effects, no writes.

**When:** Every slash command invocation.

**Why:** Testable without git or filesystem. Claude Code consumes stdout, so the assembler must produce clean markdown with no stderr pollution.

```typescript
function assembleContextPacket(
  shared: SharedContext,
  workstream: WorkstreamState,
  gitInfo: GitInfo,
  phase: string
): string {
  // Pure string assembly -- no I/O
}
```

### Pattern 3: Git Operations as Thin Wrapper

**What:** All git operations go through a single module that spawns `git` and parses output. Never use a git library (like `isomorphic-git`).

**When:** Every interaction with git state.

**Why:** Shelling out to `git` is more reliable than JS git libraries, handles all edge cases, and keeps the dependency tree small. The tool already assumes git is installed (it operates on git repos).

```typescript
// git.ts -- thin wrapper, all git operations centralized
export async function currentBranch(): Promise<string> { ... }
export async function diffSummary(base: string): Promise<DiffSummary> { ... }
export async function commitsSince(hash: string): Promise<number> { ... }
export async function isClean(): Promise<boolean> { ... }
```

### Pattern 4: Slash Commands as Thin Markdown Templates

**What:** Slash commands are `.claude/commands/branchos-*.md` files that contain a prompt template plus a `$(branchos context-packet ...)` shell invocation.

**When:** Claude Code integration.

**Why:** Claude Code slash commands are markdown files in `.claude/commands/` (project-scoped) or `~/.claude/commands/` (user-scoped). They support `$ARGUMENTS` interpolation and shell command output via `$(command)`. Keeping the markdown templates thin with the heavy lifting in the CLI binary means updates to logic don't require re-copying markdown files.

```markdown
<!-- .claude/commands/branchos-discuss.md -->
You are helping with a workstream discussion phase.

Here is the current context:

$(branchos context-packet --phase discuss)

Guide the developer through discussing $ARGUMENTS, creating artifacts in
the workstream's discuss phase directory.
```

### Pattern 5: npm Binary with `bin` Field

**What:** Distribute as npm package with a `bin` field pointing to the compiled entry point.

**When:** npm distribution.

**Why:** Standard pattern. `npm install -g branchos` creates a global binary. The `bin` field in `package.json` maps the command name to the entry script.

```json
{
  "name": "branchos",
  "bin": {
    "branchos": "./dist/bin/branchos.js"
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: CLAUDE.md Injection

**What:** Writing context directly into CLAUDE.md to influence Claude Code behavior.

**Why bad:** CLAUDE.md is project-wide, not workstream-scoped. Multiple developers modifying it creates merge conflicts. It's also opaque -- developers can't easily see what context Claude is receiving.

**Instead:** Use slash commands that explicitly assemble context via CLI. Developer sees exactly what context is being injected by reading the slash command template.

### Anti-Pattern 2: Daemon / Long-Running Process

**What:** Running a background process to watch for branch changes, file modifications, etc.

**Why bad:** Adds operational complexity, resource consumption, crash recovery concerns. A CLI tool should be stateless between invocations.

**Instead:** Use on-demand checks. When `branchos` is invoked, check staleness at that moment. Git hooks can trigger prompts without a daemon.

### Anti-Pattern 3: Database for State

**What:** Using SQLite or similar for workstream state.

**Why bad:** State must be committed to git for team visibility. Binary database files don't merge, don't diff, and don't survive branch switches cleanly.

**Instead:** JSON files for structured data, Markdown files for human-readable artifacts. Both diff and merge naturally in git.

### Anti-Pattern 4: Monolithic Command Handler

**What:** One giant file handling all commands with switch/case.

**Why bad:** Untestable, hard to navigate, coupling between unrelated features.

**Instead:** One file per command (or command group), each exporting a function that receives parsed args and returns a result. Commander.js supports this naturally with `.command()` chaining and separate action handlers.

### Anti-Pattern 5: JS Git Library (isomorphic-git, simple-git)

**What:** Using a JavaScript git implementation instead of shelling out to the system `git` binary.

**Why bad:** These libraries lag behind git features, have edge cases with large repos, and add significant dependency weight. BranchOS already requires git to be installed (it operates on git repos).

**Instead:** Thin wrapper around `child_process.execFile('git', ...)` with typed return values.

## Directory Structure

### Source Code Layout

```
branchos/
  src/
    bin/
      branchos.ts              # Entry point, CLI setup
    commands/
      map-codebase.ts          # Codebase mapping command
      workstream.ts            # Workstream CRUD commands
      context-packet.ts        # Context assembly for slash commands
      status.ts                # Status display
      phase.ts                 # Phase progression commands
    core/
      state-manager.ts         # All .branchos/ file I/O
      context-assembler.ts     # Pure function: state -> markdown
      conflict-detector.ts     # Cross-workstream file overlap
      codebase-mapper.ts       # Repo structure analysis
    git/
      git.ts                   # Git operations wrapper
      branch.ts                # Branch name parsing/sanitization
      diff.ts                  # Diff summary generation
    types/
      state.ts                 # State interfaces/schemas
      config.ts                # Configuration types
    utils/
      paths.ts                 # .branchos/ path resolution
      logger.ts                # Console output formatting
      errors.ts                # Custom error types
  templates/
    slash-commands/             # .claude/commands/ templates
      branchos-discuss.md
      branchos-plan.md
      branchos-execute.md
      branchos-status.md
  dist/                        # Compiled output
  package.json
  tsconfig.json
```

### Runtime State Layout

```
<repo>/
  .branchos/
    shared/
      codebase-map.md          # Repo structure summary
      conventions.md           # Coding conventions
      architecture.md          # Architecture decisions
      map-meta.json            # { lastCommit, lastUpdated, version }
    workstreams/
      feature-auth/
        state.json             # Workstream metadata
        phases/
          0/
            discuss.md
            plan.md
            execution-log.md
          1/
            discuss.md
            plan.md
            execution-log.md
      fix-login-bug/
        state.json
        phases/
          0/
            discuss.md
            plan.md
            execution-log.md
    archive/                   # Merged workstreams moved here
      feature-old/
        state.json
        phases/
          ...
```

## Suggested Build Order

Dependencies flow bottom-up. Build in this order:

### Layer 0: Foundation (no dependencies)

1. **Types** (`types/state.ts`, `types/config.ts`) -- Define all interfaces first. Everything else depends on these.
2. **Utils** (`utils/paths.ts`, `utils/logger.ts`, `utils/errors.ts`) -- Path resolution, output formatting, error handling.

### Layer 1: Core Infrastructure

3. **Git Layer** (`git/git.ts`, `git/branch.ts`, `git/diff.ts`) -- Thin wrapper around git binary. Needed by nearly everything above it.
4. **State Manager** (`core/state-manager.ts`) -- Read/write `.branchos/` files. Depends on Types and Utils.

### Layer 2: Business Logic

5. **Context Assembler** (`core/context-assembler.ts`) -- Pure function, depends on Types only (receives data, doesn't fetch it).
6. **Codebase Mapper** (`core/codebase-mapper.ts`) -- Depends on Git Layer and State Manager.
7. **Conflict Detector** (`core/conflict-detector.ts`) -- Depends on State Manager.

### Layer 3: Commands

8. **Workstream commands** (`commands/workstream.ts`) -- Create, list, archive. Depends on State Manager, Git Layer.
9. **Map-codebase command** (`commands/map-codebase.ts`) -- Depends on Codebase Mapper.
10. **Context-packet command** (`commands/context-packet.ts`) -- Depends on Context Assembler, State Manager, Git Layer.
11. **Status command** (`commands/status.ts`) -- Depends on State Manager, Conflict Detector.
12. **Phase command** (`commands/phase.ts`) -- Depends on State Manager.

### Layer 4: Integration

13. **CLI Entry** (`bin/branchos.ts`) -- Wires all commands together with commander.js.
14. **Slash Command Templates** (`templates/slash-commands/`) -- Markdown files that invoke the CLI.
15. **npm packaging** -- `package.json` bin field, build pipeline.

**Build order rationale:**
- Types first because every module imports them
- Git Layer early because workstream ID resolution, staleness, and diffs all need it
- State Manager before business logic because all commands read/write state
- Context Assembler is the highest-value command for Claude Code integration -- prioritize after State Manager
- Slash command templates last because they depend on the CLI binary existing

## Scalability Considerations

| Concern | 1 developer | 5 developers | 20+ developers |
|---------|-------------|--------------|----------------|
| **Workstream count** | 1-2 active | 5-10 active | Out of v1 scope |
| **State file conflicts** | None | Rare (each workstream is branch-scoped) | Consider workstream namespacing |
| **Codebase map staleness** | Manual refresh fine | Staleness detection critical | Automated refresh triggers |
| **Context packet size** | Small, fast | Medium, still fast | May need selective context loading |
| **Git operations** | Instant | Instant | May need caching for large repos |

For v1 targeting 2-5 developers, the file-based approach is well-suited. Each workstream lives in its own directory scoped to a branch, so developers rarely touch the same files. The main contention point is `.branchos/shared/` which is updated infrequently (codebase mapping).

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Shell out to git, not JS library | Smaller deps, more reliable, git is already required |
| JSON for state, Markdown for artifacts | JSON is machine-parseable, Markdown diffs well in git and is human-readable |
| Commander.js for CLI framework | Mature, lightweight, excellent TypeScript support, widely understood |
| Pure function context assembly | Testable without filesystem, separates data gathering from formatting |
| Slash commands as thin templates | Logic stays in the CLI binary, templates are stable and rarely change |
| No daemon, no watcher | CLI tools should be stateless between invocations; on-demand checks suffice |
| Workstream ID from branch name | Zero-config default, predictable, greppable in filesystem |

## Sources

- Claude Code documentation: slash commands use `.claude/commands/` directory with markdown files supporting `$ARGUMENTS` and `$(shell command)` interpolation (MEDIUM confidence -- based on established Claude Code patterns)
- Commander.js: standard CLI framework for Node.js/TypeScript (HIGH confidence)
- npm `bin` field distribution: standard pattern for CLI tools (HIGH confidence)
- File-based state committed to git: proven pattern from GSD and similar tools (HIGH confidence)
- Architecture patterns derived from analysis of the PROJECT.md requirements and established CLI tool design principles (MEDIUM confidence)
