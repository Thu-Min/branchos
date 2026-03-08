# Phase 2: Codebase Mapping - Research

**Researched:** 2026-03-08
**Domain:** Claude Code slash commands, codebase analysis, git staleness detection
**Confidence:** HIGH

## Summary

Phase 2 delivers three capabilities: (1) a Claude Code slash command that generates 5 structured codebase map files, (2) shared storage in `.branchos/shared/codebase/`, and (3) staleness detection via commit-count comparison. The implementation is straightforward because it builds on established Phase 1 patterns (GitOps, Commander CLI, auto-commit, config extension) and uses Claude Code's native slash command system rather than requiring external API calls.

The slash command is implemented as a markdown file in `.claude/commands/map-codebase.md` (or equivalently `.claude/skills/map-codebase/SKILL.md`). When invoked, Claude reads the codebase and generates the 5 map files. The CLI side (`branchos map-status`) is a pure git operation with no AI dependency. Staleness warnings integrate into commands that consume the map.

**Primary recommendation:** Use `.claude/commands/map-codebase.md` for the slash command (simpler than full skill directory for a single-file command), extend `GitOps` with `getCommitsBehind()` using `simple-git`'s `raw()` method, and extend `BranchosConfig` with map-specific fields.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multiple focused files in `.branchos/shared/codebase/`: ARCHITECTURE.md, MODULES.md, CONVENTIONS.md, STACK.md, CONCERNS.md
- ARCHITECTURE.md: high-level structure, entry points, data flow
- MODULES.md: directory-level summaries (not file-level inventory), key exports and relationships; individual files only called out for important entry points or complex logic
- CONVENTIONS.md: code patterns only (naming, file organization, state management, error handling) -- not workflow conventions
- STACK.md: list dependencies with purpose/role, not pinned versions (package.json already tracks versions)
- CONCERNS.md: descriptive observations of tech debt, complexity hotspots, potential risks -- no prescriptive fix suggestions
- Each map file includes a metadata header with commit hash and timestamp for staleness tracking
- Configurable scope: auto-exclude node_modules, dist, build, .branchos, .git; allow custom excludes in .branchos/config.json
- AI-assisted generation via Claude Code slash command -- not standalone CLI
- Map generation runs INSIDE Claude Code's context as a slash command installed in `.claude/commands/`
- No separate API key needed -- leverages Claude Code's existing AI context
- All 5 map files generated in one pass per invocation
- First run populates default exclude patterns in .branchos/config.json so users can see and customize
- Commit count comparison only (map's commit hash vs HEAD) -- not file-aware
- Configurable threshold, default 20 commits behind HEAD, via .branchos/config.json
- Inline warning before output on relevant commands only (commands that USE the map, not every command)
- Warning format: yellow warning line suggesting `/map-codebase` refresh -- non-blocking
- Full regeneration on refresh -- re-run slash command, regenerate all 5 files from scratch
- No incremental update logic
- Auto-commit updated map files (consistent with Phase 1 auto-commit pattern)
- Commit message: `chore(branchos): refresh codebase map`
- `branchos map-status` -- lightweight CLI command (no AI needed)
- Reads map metadata headers, compares commit hash to HEAD, shows commits behind count
- Pure git comparison, fast execution

### Claude's Discretion
- Slash command prompt template design and structure
- Exact metadata header format in map files
- How to handle repos with no meaningful code yet (near-empty map)
- Internal heuristics for directory grouping in MODULES.md
- Warning color/formatting details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAP-01 | User can run `branchos map-codebase` to generate a shared codebase map (architecture, modules, conventions) | Slash command in `.claude/commands/map-codebase.md` invokes Claude to analyze codebase and write 5 map files. Uses `$ARGUMENTS` for optional scope targeting. Auto-commits via GitOps. |
| MAP-02 | Codebase map is stored in `.branchos/shared/` and reused by all workstreams | Files stored in `.branchos/shared/codebase/` subdirectory. Each file has metadata header with commit hash and timestamp. Directory created during map generation if not exists. |
| MAP-03 | BranchOS detects when the codebase map is stale (N commits behind HEAD) and suggests a refresh | `GitOps.getCommitsBehind(hash)` using `git rev-list --count <hash>..HEAD`. Threshold from config (default 20). Yellow chalk warning on commands that consume the map. `branchos map-status` CLI command for manual check. |

</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-git | ^3.27.0 | Git operations (commit hash, rev-list, add+commit) | Already used in Phase 1 GitOps class |
| commander | ^12.1.0 | CLI command registration (`map-status`) | Already used for all CLI commands |
| chalk | ^4.1.2 | Colored warning output (yellow staleness warnings) | Already used in output module |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.0.0 | Unit/integration testing | All new modules |
| tsup | ^8.3.0 | Build | Existing build pipeline |

### No New Dependencies Required
This phase requires no new npm packages. All functionality is covered by existing dependencies plus Node.js built-in `fs/promises` and `path`.

## Architecture Patterns

### New Files and Directories

```
src/
├── cli/
│   ├── index.ts              # MODIFY: register map-status command
│   └── map-status.ts         # NEW: map-status CLI command handler
├── map/
│   ├── index.ts              # NEW: map module barrel export
│   ├── metadata.ts           # NEW: parse/write metadata headers in map files
│   └── staleness.ts          # NEW: staleness detection logic
├── git/
│   └── index.ts              # MODIFY: add getCommitsBehind(), getHeadHash()
├── state/
│   └── config.ts             # MODIFY: extend BranchosConfig with map fields
├── output/
│   └── index.ts              # MODIFY: add warning() function (yellow)
└── constants.ts              # MODIFY: add CODEBASE_DIR constant

.claude/
└── commands/
    └── map-codebase.md       # NEW: slash command prompt template

.branchos/
└── shared/
    └── codebase/             # CREATED AT RUNTIME by slash command
        ├── ARCHITECTURE.md
        ├── MODULES.md
        ├── CONVENTIONS.md
        ├── STACK.md
        └── CONCERNS.md
```

### Pattern 1: Slash Command as Markdown Prompt Template
**What:** The `/map-codebase` command is a `.claude/commands/map-codebase.md` file containing a natural-language prompt that instructs Claude to analyze the codebase and write the 5 map files.
**When to use:** When the command needs AI reasoning, not just programmatic logic.
**Key design:**
```markdown
---
description: Generate or refresh the codebase map in .branchos/shared/codebase/
allowed-tools: Read, Glob, Grep, Write, Bash(git rev-parse HEAD)
---

You are generating a codebase map for this repository.

## Step 1: Read configuration
Read `.branchos/config.json` to get exclude patterns from `map.excludes`.
If `map.excludes` does not exist, populate it with defaults:
["node_modules", "dist", "build", ".branchos", ".git", "*.lock", "*.min.*"]

## Step 2: Analyze the codebase
[... detailed instructions for each of the 5 files ...]

## Step 3: Write map files
Write each file to `.branchos/shared/codebase/` with this metadata header:
---
generated: <ISO timestamp>
commit: <current HEAD hash>
generator: branchos/map-codebase
---

## Step 4: Auto-commit
Run: git add .branchos/shared/codebase/ && git commit -m "chore(branchos): refresh codebase map"

$ARGUMENTS
```

**Source:** [Claude Code slash commands docs](https://code.claude.com/docs/en/slash-commands)

### Pattern 2: Metadata Header in Map Files
**What:** YAML frontmatter at the top of each generated map file for machine-readable staleness tracking.
**Format:**
```markdown
---
generated: 2026-03-08T12:00:00Z
commit: abc123def456
generator: branchos/map-codebase
---

# ARCHITECTURE

[content...]
```
**Why this format:** YAML frontmatter is a well-known convention (used in Jekyll, Hugo, MDX, etc.), easy to parse with a simple regex or string split, and does not conflict with the markdown content body.

### Pattern 3: Config Extension
**What:** Extend `BranchosConfig` interface with map-specific fields.
**Structure:**
```typescript
export interface BranchosConfig {
  schemaVersion: number;
  map?: {
    excludes?: string[];
    stalenessThreshold?: number; // default 20
  };
}
```
**Important:** Use optional fields so existing config.json files (from Phase 1 `branchos init`) remain valid without migration. The slash command populates defaults on first run.

### Pattern 4: Commander Subcommand Registration
**What:** Follow established `registerXxxCommand(program)` pattern for `map-status`.
**Example:**
```typescript
// src/cli/map-status.ts
import { Command } from 'commander';
import { GitOps } from '../git/index.js';
import { parseMapMetadata } from '../map/metadata.js';
import { checkStaleness } from '../map/staleness.js';
import { output, error, warning } from '../output/index.js';

export function registerMapStatusCommand(program: Command): void {
  program
    .command('map-status')
    .description('Show codebase map status and staleness')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      // ... implementation
    });
}
```

### Anti-Patterns to Avoid
- **Do NOT parse git output manually with child_process:** Use `simple-git`'s `raw()` method which returns the output as a string. The project already depends on `simple-git`.
- **Do NOT require the map to exist before other commands work:** Map is optional. Commands that warn about staleness must gracefully handle "no map exists yet."
- **Do NOT auto-generate map on `branchos init`:** Map generation requires AI (Claude Code context). Init is a pure CLI operation.
- **Do NOT version the codebase/ directory structure:** The map files are regenerated from scratch each time. No incremental updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom regex parser | Simple string split on `---` delimiters | Only 3 fields (generated, commit, generator); full YAML parser is overkill. Split on first two `---` occurrences. |
| Git commit counting | Raw child_process exec | `simple-git` `raw('rev-list', '--count', ...)` | Already a project dependency; handles error cases and cwd management |
| Colored terminal output | ANSI escape codes | `chalk.yellow()` via existing output module | Already a project dependency with established patterns |
| Slash command AI logic | Custom API calls | `.claude/commands/` markdown file | Claude Code handles all AI interaction; slash command is just a prompt template |

**Key insight:** The AI-heavy part (codebase analysis and map generation) is entirely delegated to Claude Code via the slash command. The BranchOS codebase only handles the mechanical parts: config, staleness detection, status display, and auto-commit.

## Common Pitfalls

### Pitfall 1: Slash Command Trying to Do Too Much
**What goes wrong:** Overloading the slash command prompt with every edge case makes Claude's output inconsistent.
**Why it happens:** Temptation to handle all scenarios in one prompt.
**How to avoid:** Keep the prompt focused on the 5 file templates. Use clear section headers and explicit format examples. Let `$ARGUMENTS` handle any user-specified focus areas.
**Warning signs:** Map files have inconsistent structure across runs.

### Pitfall 2: Missing Map Crashes Commands
**What goes wrong:** Commands that check staleness throw unhandled errors when no map exists yet.
**Why it happens:** Developers assume the map always exists after init.
**How to avoid:** Every staleness check must handle the "no map files found" case gracefully -- either skip the warning silently or show "No codebase map found. Run `/map-codebase` to generate one."
**Warning signs:** `ENOENT` errors from map file reads.

### Pitfall 3: Stale Commit Hash After Rebase/Force-Push
**What goes wrong:** The stored commit hash no longer exists in the repo history (after rebase or force-push), causing `git rev-list --count` to fail.
**Why it happens:** Commit hashes are not stable across history rewrites.
**How to avoid:** Wrap `rev-list` in a try/catch. If the hash is not found in history, treat the map as "unknown staleness" and recommend a refresh. Never crash.
**Warning signs:** `fatal: Invalid revision range` error from git.

### Pitfall 4: Config Schema Backward Compatibility
**What goes wrong:** Existing `config.json` from Phase 1 (which has only `schemaVersion`) breaks when map code expects `map.excludes`.
**Why it happens:** Not using optional fields or not providing defaults.
**How to avoid:** Make all `map.*` config fields optional. Code always falls back to hardcoded defaults when fields are missing. The slash command populates them on first run.
**Warning signs:** `TypeError: Cannot read property 'excludes' of undefined`.

### Pitfall 5: Auto-Commit in Slash Command Context
**What goes wrong:** The slash command runs `git add && git commit` but Claude Code may have uncommitted changes in the working tree, causing unexpected files to be staged.
**Why it happens:** `git add .branchos/shared/codebase/` could pick up other changes if the path pattern is too broad.
**How to avoid:** Use specific file paths in the git add: `git add .branchos/shared/codebase/ARCHITECTURE.md .branchos/shared/codebase/MODULES.md ...` (all 5 files explicitly). Or use the `Bash` tool with the exact paths.
**Warning signs:** Commit includes files outside the codebase map directory.

## Code Examples

### GitOps Extension: getCommitsBehind and getHeadHash
```typescript
// Source: simple-git raw() API + git rev-list docs
// Add to src/git/index.ts

async getHeadHash(): Promise<string> {
  const hash = await this.git.revparse(['HEAD']);
  return hash.trim();
}

async getCommitsBehind(fromHash: string): Promise<number> {
  try {
    const result = await this.git.raw(['rev-list', '--count', `${fromHash}..HEAD`]);
    return parseInt(result.trim(), 10);
  } catch {
    // Hash not found (e.g., after rebase) -- return -1 to signal unknown
    return -1;
  }
}
```

### Metadata Parsing
```typescript
// src/map/metadata.ts

export interface MapMetadata {
  generated: string;
  commit: string;
  generator: string;
}

export function parseMapMetadata(content: string): MapMetadata | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const lines = match[1].split('\n');
  const meta: Record<string, string> = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length > 0) {
      meta[key.trim()] = rest.join(':').trim();
    }
  }

  if (!meta.generated || !meta.commit || !meta.generator) return null;

  return {
    generated: meta.generated,
    commit: meta.commit,
    generator: meta.generator,
  };
}
```

### Staleness Check
```typescript
// src/map/staleness.ts

import { readFile } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { parseMapMetadata } from './metadata.js';

export interface StalenessResult {
  exists: boolean;
  commitsBehind: number;  // -1 if unknown
  isStale: boolean;
  mapCommit?: string;
  headCommit?: string;
  generated?: string;
}

const MAP_FILES = ['ARCHITECTURE.md', 'MODULES.md', 'CONVENTIONS.md', 'STACK.md', 'CONCERNS.md'];

export async function checkStaleness(
  repoRoot: string,
  threshold: number = 20,
): Promise<StalenessResult> {
  const codebaseDir = join(repoRoot, '.branchos', 'shared', 'codebase');
  const git = new GitOps(repoRoot);

  // Try to read metadata from any map file (all should have same commit)
  for (const file of MAP_FILES) {
    try {
      const content = await readFile(join(codebaseDir, file), 'utf-8');
      const meta = parseMapMetadata(content);
      if (meta) {
        const headHash = await git.getHeadHash();
        const behind = await git.getCommitsBehind(meta.commit);
        return {
          exists: true,
          commitsBehind: behind,
          isStale: behind === -1 || behind >= threshold,
          mapCommit: meta.commit,
          headCommit: headHash,
          generated: meta.generated,
        };
      }
    } catch {
      continue;
    }
  }

  return { exists: false, commitsBehind: -1, isStale: false };
}
```

### Warning Output Function
```typescript
// Add to src/output/index.ts

export function warning(
  message: string,
  options: { json?: boolean },
): void {
  if (options.json) {
    console.error(JSON.stringify({ warning: message }));
  } else {
    console.error(chalk.yellow('Warning: ') + message);
  }
}
```

### Config Extension
```typescript
// Extend src/state/config.ts

export interface MapConfig {
  excludes?: string[];
  stalenessThreshold?: number;
}

export interface BranchosConfig {
  schemaVersion: number;
  map?: MapConfig;
}

export function getMapExcludes(config: BranchosConfig): string[] {
  return config.map?.excludes ?? [
    'node_modules', 'dist', 'build', '.branchos', '.git', '*.lock', '*.min.*'
  ];
}

export function getStalenessThreshold(config: BranchosConfig): number {
  return config.map?.stalenessThreshold ?? 20;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/` files | `.claude/skills/` directories | 2026 (unified) | Both still work; commands are simpler for single-file prompts. Skills add supporting files + auto-invocation control. |
| Custom slash commands lacked frontmatter | YAML frontmatter with `allowed-tools`, `context`, `agent`, etc. | 2025-2026 | Can restrict tool access, run in subagent, control invocation |

**Current recommendation:** Use `.claude/commands/map-codebase.md` (single file) rather than the full skills directory structure. The map-codebase command is a single prompt template with no supporting files needed. If supporting files are needed later, it can be moved to `.claude/skills/map-codebase/SKILL.md` without breaking anything.

## Open Questions

1. **Slash command prompt quality**
   - What we know: The prompt template must instruct Claude to generate 5 specific files with specific content guidelines
   - What's unclear: Optimal prompt structure for consistent, high-quality map output across different codebase sizes
   - Recommendation: Start with a straightforward template, test on this repo, iterate. Include format examples for each file in the prompt.

2. **Near-empty repos**
   - What we know: Some repos may have minimal code (e.g., just initialized)
   - What's unclear: What should a map look like for a 3-file repo?
   - Recommendation: Generate all 5 files but with minimal content. The slash command prompt should instruct Claude to note "This is a small/new codebase" rather than padding content.

3. **Which future commands consume the map (and thus show staleness warnings)?**
   - What we know: Phase 2 only delivers `map-status` and the slash command. Staleness warnings go on "commands that USE the map."
   - What's unclear: Those commands don't exist yet (Phase 3-4).
   - Recommendation: Build the staleness warning as a reusable utility function. Wire it into `map-status` now. Future phases wire it into their commands.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAP-01 | Slash command file exists and has valid frontmatter | unit | `npx vitest run tests/map/slash-command.test.ts -t "slash command"` | No -- Wave 0 |
| MAP-01 | Config defaults populated when map.excludes missing | unit | `npx vitest run tests/state/config.test.ts -t "map config"` | No -- Wave 0 |
| MAP-01 | Auto-commit after map generation | integration | Manual (requires Claude Code context) | manual-only |
| MAP-02 | Map files stored in .branchos/shared/codebase/ | unit | `npx vitest run tests/map/metadata.test.ts -t "map storage"` | No -- Wave 0 |
| MAP-02 | Metadata header parsing (generated, commit, generator) | unit | `npx vitest run tests/map/metadata.test.ts -t "parseMapMetadata"` | No -- Wave 0 |
| MAP-03 | Staleness detection: commits behind count | unit | `npx vitest run tests/map/staleness.test.ts -t "staleness"` | No -- Wave 0 |
| MAP-03 | Staleness detection: unknown hash (rebase scenario) | unit | `npx vitest run tests/map/staleness.test.ts -t "unknown hash"` | No -- Wave 0 |
| MAP-03 | map-status CLI command output | unit | `npx vitest run tests/cli/map-status.test.ts -t "map-status"` | No -- Wave 0 |
| MAP-03 | Warning display when stale | unit | `npx vitest run tests/output/index.test.ts -t "warning"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/map/metadata.test.ts` -- covers MAP-02 metadata parsing
- [ ] `tests/map/staleness.test.ts` -- covers MAP-03 staleness detection
- [ ] `tests/cli/map-status.test.ts` -- covers MAP-03 CLI command
- [ ] `tests/map/slash-command.test.ts` -- covers MAP-01 slash command file validation
- [ ] `tests/state/config.test.ts` (extend existing) -- covers MAP-01 config defaults

## Sources

### Primary (HIGH confidence)
- [Claude Code slash commands official docs](https://code.claude.com/docs/en/slash-commands) - full slash command/skills format, frontmatter options, `$ARGUMENTS`, directory structure
- Existing codebase (src/git/index.ts, src/cli/*.ts, src/state/config.ts) - established patterns and reusable code
- simple-git `raw()` method (node_modules/simple-git/dist/typings) - supports arbitrary git commands including `rev-list --count`

### Secondary (MEDIUM confidence)
- [Git rev-list docs](https://git-scm.com/docs/git-rev-list) - `--count` flag for commit counting between ranges

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all patterns established in Phase 1
- Architecture: HIGH - straightforward extension of existing patterns, slash command format verified via official docs
- Pitfalls: HIGH - identified from direct code reading and git edge cases

**Research date:** 2026-03-08
**Valid until:** 2026-04-07 (stable domain, no fast-moving dependencies)
