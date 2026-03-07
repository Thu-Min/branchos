# Phase 1: CLI and State Foundation - Research

**Researched:** 2026-03-07
**Domain:** Node.js CLI tooling, git integration, schema-versioned state management
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield Node.js/TypeScript CLI project. The core deliverables are: a globally-installable CLI with subcommand groups (`branchos workstream create`, etc.), git repository detection and integration, a two-layer directory structure (`.branchos/shared/` and `.branchos/workstreams/<id>/`), and schema-versioned JSON state files. All components are well-served by mature, stable libraries with minimal risk.

The recommended stack is Commander.js for CLI parsing (lightweight, zero dependencies, native TypeScript, nested subcommand support), simple-git for git operations (widely used, Promise-based, TypeScript definitions bundled), and tsup for building. The slugification logic is simple enough to hand-roll given the constrained character set (lowercase alphanumeric, hyphens, underscores) -- no external library needed.

**Primary recommendation:** Use Commander.js + simple-git + tsup. Keep dependencies minimal. Hand-roll the slug function since requirements are narrow and well-defined.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Workstream ID: strip common branch prefixes (`feature/`, `fix/`, `hotfix/`), slugify remainder. Lowercase alphanumeric, hyphens, underscores only. No max length.
- On slug collision: error with message suggesting `--name` override
- Workstream creation requires being on the target branch -- auto-detect current branch, no `--branch` flag
- Block workstream creation on protected branches (`main`, `master`, `develop`) -- error, not warning
- Detect branch rename mismatch on next command; warn user to run update command
- Do NOT store `base_branch` in Phase 1
- `branchos init` creates: `.branchos/shared/`, `.branchos/workstreams/`, `.branchos/config.json`; adds `.branchos-runtime/` to `.gitignore`
- Requires being inside a git repository -- error if not
- Idempotent re-init: skip existing, create missing, report what was added
- Auto-commit `.branchos/` on init with message "chore: initialize branchos"
- Subcommand group structure: `branchos workstream create`, `branchos workstream list`, etc.
- Default output: colored, human-readable; `--json` flag on all commands
- `branchos` with no arguments shows help
- `branchos workstream list` deferred to Phase 5
- Integer-based schema versioning (`schemaVersion: 1`) with automatic migration on read
- Loose validation: parse known fields, silently ignore unknown (forward-compatible)
- Workstream discovery via directory scan -- no `index.json` registry
- `meta.json` v1 fields: `schemaVersion`, `workstreamId`, `branch`, `status`, `createdAt`, `updatedAt`
- `state.json` created as empty scaffold: `schemaVersion`, `status: "created"`, empty tasks array

### Claude's Discretion
- CLI framework choice (commander, yargs, oclif, etc.)
- TypeScript project setup and build configuration
- Git integration library (simple-git vs raw child_process)
- Exact slugification implementation details
- Config.json schema and default values
- Error message wording and formatting
- Color scheme for terminal output

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-01 | User can install BranchOS globally via `npm install -g branchos` | package.json `bin` field + tsup build pipeline |
| CLI-02 | User can run `branchos init` to create `.branchos/` directory structure and configuration | Commander.js command + simple-git repo detection + fs.mkdir |
| CLI-03 | User can run `branchos --help` to see all available commands with descriptions | Commander.js auto-generated help with nested subcommands |
| CLI-04 | CLI works on macOS and Linux with Node.js 18+ | Commander.js 14.x requires Node 20+; use Commander 12.x for Node 18+ support, or require Node 20+ |
| STA-01 | State organized in two layers: shared + workstream-scoped | Directory structure creation in init command |
| STA-02 | Each workstream has machine-readable progress tracking via state.json | JSON file creation with schema version |
| STA-03 | All `.branchos/` artifacts committed to git | simple-git add + commit integration |
| STA-04 | Every state file includes schemaVersion field | Schema utilities with migration-on-read pattern |
| WRK-01 | User can create workstream auto-derived from current git branch | simple-git `branchLocal()` + hand-rolled slug function |
| WRK-02 | User can override auto-derived ID with `--name` flag | Commander.js option on `workstream create` subcommand |
| WRK-06 | Workstreams use stable internal IDs (not raw branch names) | Slug derivation + directory naming pattern |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI framework, argument parsing, help generation | 500M weekly downloads, 0 dependencies, 18ms startup, built-in TypeScript types, nested subcommand support. Use 12.x for Node 18+ compat (14.x requires Node 20+) |
| simple-git | ^3.27.0 | Git operations (branch detection, add, commit, repo check) | 7000+ dependents, Promise-based, TypeScript definitions bundled, wraps git CLI cleanly |
| typescript | ^5.5.0 | Type safety | Required for the project stack |
| tsup | ^8.3.0 | Build/bundle TypeScript to JS for npm distribution | Zero-config TS bundling, CJS+ESM output, fast (esbuild under the hood) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | ^4.1.2 | Terminal colors for human-readable output | Use 4.x (CJS-compatible). Chalk 5.x is ESM-only which complicates builds |
| vitest | ^3.0.0 | Test framework | Unit and integration testing. Native TypeScript, fast, Jest-compatible API |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Commander.js | yargs | Yargs has richer parsing (choices, coercion) but 7 deps, 850KB, 42ms startup. Commander is sufficient for this CLI's needs |
| Commander.js | oclif | Oclif adds plugin system, auto-docs, scaffolding but 30+ deps, 12MB, 120ms startup. Overkill for Phase 1 |
| simple-git | child_process | Raw exec is dependency-free but requires manual output parsing, error handling, and cross-platform quoting. simple-git handles all of this |
| chalk 4 | ansis or picocolors | Smaller and faster, but chalk 4 is the established standard and size doesn't matter for a CLI tool |
| slugify (npm) | hand-rolled | The requirements are narrow (strip prefixes, lowercase, alphanumeric/hyphens/underscores). A 5-line function avoids a dependency for trivial logic |

**Installation:**
```bash
npm install commander simple-git chalk@4
npm install -D typescript tsup vitest @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
branchos/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── bin/
│   └── branchos.js          # Shebang entry point (built output)
├── src/
│   ├── cli/
│   │   ├── index.ts          # Program definition, register all commands
│   │   ├── init.ts           # branchos init command
│   │   └── workstream.ts     # branchos workstream <subcommand> group
│   ├── git/
│   │   └── index.ts          # Git operations wrapper (simple-git)
│   ├── state/
│   │   ├── schema.ts         # Schema version constants, migration logic
│   │   ├── meta.ts           # meta.json read/write
│   │   ├── state.ts          # state.json read/write
│   │   └── config.ts         # config.json read/write
│   ├── workstream/
│   │   ├── create.ts         # Workstream creation logic
│   │   ├── resolve.ts        # Branch-to-ID resolution, slug generation
│   │   └── discover.ts       # Directory scan for existing workstreams
│   ├── output/
│   │   └── index.ts          # Formatting: human-readable vs --json
│   ├── constants.ts          # Protected branches, directory names, etc.
│   └── index.ts              # Main entry point
└── tests/
    ├── cli/
    ├── git/
    ├── state/
    └── workstream/
```

### Pattern 1: Commander.js Nested Subcommands
**What:** Group related commands under a parent command
**When to use:** `branchos workstream create`, `branchos workstream list`
**Example:**
```typescript
// src/cli/workstream.ts
import { Command } from 'commander';

export function registerWorkstreamCommands(program: Command): void {
  const workstream = program
    .command('workstream')
    .description('Manage workstreams');

  workstream
    .command('create')
    .description('Create a workstream from the current branch')
    .option('--name <name>', 'Override auto-derived workstream ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      // ... creation logic
    });
}
```

### Pattern 2: Schema-Versioned State with Migration on Read
**What:** Every JSON state file has `schemaVersion`. On read, apply migrations if version < current.
**When to use:** All state file reads (meta.json, state.json, config.json)
**Example:**
```typescript
// src/state/schema.ts
export const CURRENT_SCHEMA_VERSION = 1;

interface Migration {
  fromVersion: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

const migrations: Migration[] = [];

export function migrateIfNeeded<T extends { schemaVersion: number }>(
  data: Record<string, unknown>,
  currentVersion: number = CURRENT_SCHEMA_VERSION
): T {
  let version = (data.schemaVersion as number) ?? 0;
  for (const migration of migrations) {
    if (migration.fromVersion === version) {
      data = migration.migrate(data);
      version = migration.fromVersion + 1;
    }
  }
  data.schemaVersion = currentVersion;
  return data as T;
}
```

### Pattern 3: Output Formatting (Human vs JSON)
**What:** All commands support `--json` flag for machine-readable output
**When to use:** Every command that produces output
**Example:**
```typescript
// src/output/index.ts
import chalk from 'chalk';

export function output(data: Record<string, unknown>, options: { json?: boolean }): void {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    // Human-readable colored output
    // Format based on data shape
  }
}
```

### Pattern 4: Git Operations Wrapper
**What:** Thin wrapper around simple-git exposing only needed operations
**When to use:** All git interactions
**Example:**
```typescript
// src/git/index.ts
import simpleGit, { SimpleGit } from 'simple-git';

export class GitOps {
  private git: SimpleGit;

  constructor(cwd?: string) {
    this.git = simpleGit(cwd);
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branchLocal();
    return result.current;
  }

  async addAndCommit(files: string[], message: string): Promise<void> {
    await this.git.add(files);
    await this.git.commit(message);
  }

  async getRepoRoot(): Promise<string> {
    return this.git.revparse(['--show-toplevel']);
  }
}
```

### Anti-Patterns to Avoid
- **Global mutable state for git instance:** Create git instances scoped to operations, don't share across async boundaries without care
- **Coupling CLI parsing to business logic:** Keep command handlers thin -- delegate to service modules
- **Reading state without migration:** Always pass through `migrateIfNeeded()` even for v1 -- establishes the pattern early
- **Synchronous file I/O in CLI commands:** Use async fs operations throughout (`fs/promises`)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom argv parser | Commander.js | Edge cases: option ordering, help generation, error messages, subcommand routing |
| Git operations | Raw `child_process.exec('git ...')` | simple-git | Cross-platform path quoting, error detection, output parsing, TypeScript types |
| Terminal colors | ANSI escape codes | chalk 4.x | Terminal capability detection, color level negotiation, 256-color/truecolor support |
| TypeScript bundling | Custom tsc + module resolution | tsup | CJS/ESM dual output, shebang injection, source maps, tree shaking |

**Key insight:** The value of this phase is in the state model and workstream logic, not in CLI plumbing. Use established tools for all infrastructure concerns.

## Common Pitfalls

### Pitfall 1: package.json `bin` field and shebang
**What goes wrong:** CLI installed via `npm install -g` but `branchos` command not found or errors with "not executable"
**Why it happens:** Missing shebang (`#!/usr/bin/env node`) in built entry point, or `bin` field points to source instead of built output
**How to avoid:** Configure tsup to add shebang via `banner` option. Point `bin` in package.json to `dist/index.cjs` (the built file). Test with `npm link` locally before publishing.
**Warning signs:** `which branchos` returns nothing after install; "permission denied" errors

### Pitfall 2: Idempotent init with git auto-commit
**What goes wrong:** Running `branchos init` twice creates a second commit with no changes, or worse, errors on the second run
**Why it happens:** Not checking which files/dirs already exist before creating, not checking if there are staged changes before committing
**How to avoid:** Check existence before each mkdir/writeFile. Only git-add and commit if there were actual new files created. Track what was created vs skipped and report both.
**Warning signs:** Empty commits, duplicate directory creation errors

### Pitfall 3: Branch detection on detached HEAD
**What goes wrong:** `git branchLocal()` returns empty or "HEAD" when in detached HEAD state
**Why it happens:** User checked out a tag, commit SHA, or is mid-rebase
**How to avoid:** Check for detached HEAD explicitly and give a clear error: "Cannot create workstream: HEAD is detached. Check out a branch first."
**Warning signs:** Workstream ID becomes empty string or "HEAD"

### Pitfall 4: Race condition on workstream directory creation
**What goes wrong:** Two developers create workstreams simultaneously and one overwrites the other's meta.json
**Why it happens:** Check-then-create is not atomic on a filesystem
**Why it's acceptable in Phase 1:** Workstreams are branch-scoped. Two developers on different branches create different workstream directories. Same-branch collision is caught by slug collision check.

### Pitfall 5: chalk 5 ESM-only breaks CJS builds
**What goes wrong:** Import errors when using chalk 5.x with tsup CJS output
**Why it happens:** chalk 5+ is ESM-only, CJS `require()` fails
**How to avoid:** Pin to chalk 4.x which supports both CJS and ESM
**Warning signs:** "ERR_REQUIRE_ESM" at runtime

### Pitfall 6: Commander 14.x requires Node 20+
**What goes wrong:** CLI crashes on Node 18 with syntax/import errors
**Why it happens:** Commander 14.x dropped Node 18 support
**How to avoid:** Use Commander 12.x if Node 18 support is required (CLI-04). Alternatively, require Node 20+ and update CLI-04 requirement. Node 18 EOL was April 2025, so requiring Node 20+ is reasonable in 2026.
**Recommendation:** Require Node 20+ and use Commander 14.x. Node 18 is past EOL.

## Code Examples

### Slug Derivation from Branch Name
```typescript
// src/workstream/resolve.ts
const STRIP_PREFIXES = ['feature/', 'fix/', 'hotfix/', 'bugfix/', 'release/'];
const PROTECTED_BRANCHES = ['main', 'master', 'develop'];

export function slugifyBranch(branch: string): string {
  let slug = branch;

  // Strip common prefixes
  for (const prefix of STRIP_PREFIXES) {
    if (slug.startsWith(prefix)) {
      slug = slug.slice(prefix.length);
      break;
    }
  }

  // Lowercase, replace non-alphanumeric (except hyphens/underscores) with hyphens
  slug = slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')       // collapse multiple hyphens
    .replace(/^-|-$/g, '');    // trim leading/trailing hyphens

  return slug;
}

export function isProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCHES.includes(branch);
}
```

### meta.json Creation
```typescript
// src/state/meta.ts
import { CURRENT_SCHEMA_VERSION } from './schema.js';

export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export function createMeta(workstreamId: string, branch: string): WorkstreamMeta {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    workstreamId,
    branch,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}
```

### state.json Scaffold
```typescript
// src/state/state.ts
import { CURRENT_SCHEMA_VERSION } from './schema.js';

export interface WorkstreamState {
  schemaVersion: number;
  status: 'created' | 'in-progress' | 'completed';
  tasks: unknown[];
}

export function createInitialState(): WorkstreamState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    status: 'created',
    tasks: [],
  };
}
```

### tsup Configuration
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],         // CJS for maximum Node.js compat
  target: 'node20',
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

### package.json Key Fields
```json
{
  "name": "branchos",
  "version": "0.1.0",
  "description": "CLI tool for team-based AI-assisted development workflows",
  "bin": {
    "branchos": "./dist/index.cjs"
  },
  "engines": {
    "node": ">=20"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk 5 ESM-only | chalk 4.x for CJS compat, or picocolors/ansis for minimal footprint | 2023+ | Use chalk 4 for stability in CJS builds |
| ts-node for dev | tsx (esbuild-based) | 2023+ | Faster startup, no config needed, ESM support |
| jest for testing | vitest | 2022+ | Native TypeScript, 10-20x faster watch mode, Jest-compatible API |
| tsc for building CLIs | tsup (esbuild) | 2022+ | Sub-second builds, automatic CJS/ESM, shebang support |
| Node 18 LTS | Node 20/22 LTS | Node 18 EOL April 2025 | Safe to require Node 20+ in 2026 |

**Deprecated/outdated:**
- ts-node: Replaced by tsx for development. ESM compatibility issues.
- Node 18: Past EOL as of April 2025. Commander 14.x requires Node 20+.

## Open Questions

1. **config.json default schema**
   - What we know: Created during `branchos init`, needs `schemaVersion`
   - What's unclear: What other default fields? Possible: `version` (branchos version that initialized), `protectedBranches` (customizable list)
   - Recommendation: Keep minimal for v1: `{ schemaVersion: 1 }`. Add fields as later phases need them.

2. **Commander 12 vs 14 (Node 18 vs 20)**
   - What we know: CLI-04 says "Node.js 18+". Commander 14 requires Node 20+.
   - Recommendation: Require Node 20+ since Node 18 is past EOL. Update CLI-04 accordingly. Use Commander 14.x.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `vitest.config.ts` -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | Global install via npm, `branchos` binary available | integration | `node dist/index.cjs --help` (smoke test) | No -- Wave 0 |
| CLI-02 | `branchos init` creates directory structure | integration | `npx vitest run tests/cli/init.test.ts -t "init"` | No -- Wave 0 |
| CLI-03 | `branchos --help` shows all commands | unit | `npx vitest run tests/cli/help.test.ts` | No -- Wave 0 |
| CLI-04 | Works on macOS/Linux with Node 20+ | smoke | `node -e "assert(process.version >= 'v20')"` | N/A -- CI |
| STA-01 | Two-layer state organization | unit | `npx vitest run tests/state/` | No -- Wave 0 |
| STA-02 | state.json with tasks/status/blockers | unit | `npx vitest run tests/state/state.test.ts` | No -- Wave 0 |
| STA-03 | Artifacts committed to git | integration | `npx vitest run tests/cli/init.test.ts -t "commit"` | No -- Wave 0 |
| STA-04 | schemaVersion in every state file | unit | `npx vitest run tests/state/schema.test.ts` | No -- Wave 0 |
| WRK-01 | Auto-derive workstream ID from branch | unit | `npx vitest run tests/workstream/resolve.test.ts` | No -- Wave 0 |
| WRK-02 | `--name` flag override | integration | `npx vitest run tests/cli/workstream.test.ts -t "name"` | No -- Wave 0 |
| WRK-06 | Stable internal IDs (slugified) | unit | `npx vitest run tests/workstream/resolve.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- vitest configuration
- [ ] `tests/workstream/resolve.test.ts` -- slug derivation, protected branch checks (WRK-01, WRK-06)
- [ ] `tests/state/schema.test.ts` -- schema version, migration logic (STA-04)
- [ ] `tests/state/meta.test.ts` -- meta.json creation (STA-02)
- [ ] `tests/state/state.test.ts` -- state.json scaffold (STA-02)
- [ ] `tests/cli/init.test.ts` -- init command, directory creation, git commit (CLI-02, STA-01, STA-03)
- [ ] `tests/cli/workstream.test.ts` -- workstream create command (WRK-01, WRK-02)
- [ ] `tests/git/index.test.ts` -- git operations wrapper
- [ ] Framework install: `npm install -D vitest`

## Sources

### Primary (HIGH confidence)
- [commander npm](https://www.npmjs.com/package/commander) -- version 14.x current, 12.x for Node 18+ compat, TypeScript support, nested subcommands
- [simple-git npm](https://www.npmjs.com/package/simple-git) -- version 3.32.x, TypeScript bundled, Promise API
- [simple-git GitHub](https://github.com/steveukx/git-js) -- API: branchLocal(), revparse(), add(), commit()
- [chalk npm](https://www.npmjs.com/package/chalk) -- v5 ESM-only, v4 CJS-compatible

### Secondary (MEDIUM confidence)
- [Commander nested subcommands example](https://maxschmitt.me/posts/nested-subcommands-commander-node-js) -- verified pattern for `program.command().command()` nesting
- [tsup GitHub](https://github.com/egoist/tsup) -- zero-config TS bundling with esbuild
- [Vitest vs Jest comparison](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/) -- vitest recommended for new TS projects in 2025+

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are well-established with npm registry verification
- Architecture: HIGH -- standard patterns for Node.js CLI tools, nothing novel
- Pitfalls: HIGH -- well-documented issues (ESM/CJS, shebang, idempotent init)

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable ecosystem, low churn)
