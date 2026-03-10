# Phase 10: Slash Command Migration - Research

**Researched:** 2026-03-10
**Domain:** CLI architecture, tsup build pipeline, Claude Code slash commands
**Confidence:** HIGH

## Summary

Phase 10 migrates BranchOS from a CLI-heavy architecture to a slash-command-first model. The existing `install-commands.ts` contains 10 slash commands as string literals (~730 lines). The migration involves: (1) extracting these to individual `.md` files in a `commands/` directory, (2) bundling them at build time via tsup's native `loader` option, (3) creating 4 new slash commands (create-workstream, list-workstreams, status, archive), (4) removing all workflow CLI commands, and (5) bumping to v2.0.0.

The technical approach is straightforward. tsup exposes esbuild's `loader` option natively, so `.md` files can be imported as strings with `loader: { '.md': 'text' }` in `tsup.config.ts` -- no external plugin needed. The new slash commands delegate to existing CLI handlers via `npx branchos` calls, following established patterns. The `/branchos:status` command consolidates map-status, check-drift, and detect-conflicts into a single dashboard.

**Primary recommendation:** Use tsup's native `loader: { '.md': 'text' }` to bundle markdown files as strings. No new dependencies required.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Move all slash command content from string literals in `install-commands.ts` to individual `.md` files in `commands/` at repo root
- Build step (tsup) bundles `.md` files into the compiled output as a JS object -- no runtime file resolution needed
- Migrate all existing 10 slash commands to `.md` files (clean break, one pattern going forward)
- `install-commands.ts` reads from the bundled object and writes to `~/.claude/commands/`
- Remove all workflow CLI commands immediately (no deprecation warnings, no redirect messages)
- CLI retains only: `init` and `install-commands`
- `branchos init` auto-runs `install-commands` after setting up `.branchos/`
- Bump version to 2.0.0 (breaking change warrants major version)
- Silent removal -- Commander shows "unknown command" for removed commands
- New slash commands: `/branchos:create-workstream`, `/branchos:list-workstreams`, `/branchos:status`, `/branchos:archive`
- Folded commands: `map-status`, `check-drift`, `detect-conflicts` folded into `/branchos:status` (no standalone slash commands)
- Verb-noun flat naming pattern; no renaming of existing slash commands

### Claude's Discretion
- tsup plugin or build script approach for bundling .md files
- Exact dashboard layout and section ordering in /branchos:status
- How to handle `$ARGUMENTS` passthrough in new slash commands
- Auto-commit behavior in new slash commands (follow existing patterns)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MIGR-01 | All v1 CLI workflow commands migrated to `/branchos:*` slash commands | Existing 10 slash commands extracted to .md files; 4 new slash commands created (create-workstream, list-workstreams, status, archive); 3 commands folded into status dashboard |
| MIGR-02 | CLI reduced to bootstrapper commands only (init, install-commands) | Remove 13 command registrations from index.ts; keep only registerInitCommand and registerInstallCommandsCommand; init auto-runs install-commands |
</phase_requirements>

## Standard Stack

### Core (No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | ^8.3.0 | Build bundler with esbuild `loader` option | Already in project; native `loader: { '.md': 'text' }` handles markdown bundling |
| commander | ^12.1.0 | CLI framework | Already in project; removing commands is just removing `register*` calls |

### Supporting
No new libraries needed. This phase is purely restructuring existing code and content.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup native `loader` | esbuild-raw-plugin | Adds dependency for zero benefit; native option does the same thing |
| tsup native `loader` | Pre-build script copying .md to .ts | More complex, fragile, unnecessary |
| Import per-file | Glob import pattern | tsup doesn't support glob imports; explicit imports are clearer |

## Architecture Patterns

### Recommended Project Structure
```
commands/                          # NEW: source .md files for slash commands
├── branchos:map-codebase.md
├── branchos:context.md
├── branchos:discuss-phase.md
├── branchos:plan-phase.md
├── branchos:execute-phase.md
├── branchos:ingest-prfaq.md
├── branchos:plan-roadmap.md
├── branchos:features.md
├── branchos:sync-issues.md
├── branchos:refresh-roadmap.md
├── branchos:create-workstream.md  # NEW
├── branchos:list-workstreams.md   # NEW
├── branchos:status.md             # NEW (consolidated dashboard)
└── branchos:archive.md            # NEW
src/
├── cli/
│   ├── index.ts                   # MODIFIED: only init + install-commands
│   ├── init.ts                    # MODIFIED: auto-run install-commands
│   ├── install-commands.ts        # REFACTORED: reads bundled .md content
│   └── ...                        # Other files stay (handlers still used by slash commands)
└── commands/                      # NEW: barrel export for bundled .md content
    └── index.ts                   # Imports all .md files, exports COMMANDS record
```

### Pattern 1: Bundling .md Files with tsup
**What:** Use tsup's native esbuild `loader` option to treat `.md` files as text strings at build time.
**When to use:** When you need to embed file content as strings in the bundle without runtime file I/O.

tsup.config.ts:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  loader: {
    '.md': 'text',
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

TypeScript declaration (needed for `.md` imports):
```typescript
// src/commands/markdown.d.ts
declare module '*.md' {
  const content: string;
  export default content;
}
```

Import pattern in src/commands/index.ts:
```typescript
import mapCodebase from '../../commands/branchos:map-codebase.md';
import context from '../../commands/branchos:context.md';
// ... etc for all 14 commands

export const COMMANDS: Record<string, string> = {
  'branchos:map-codebase.md': mapCodebase,
  'branchos:context.md': context,
  // ... etc
};
```

### Pattern 2: Refactored install-commands.ts
**What:** The install function reads from the bundled COMMANDS object instead of inline strings.
**When to use:** After extracting .md files.

```typescript
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { COMMANDS } from '../commands/index.js';

export function registerInstallCommandsCommand(program: Command): void {
  program
    .command('install-commands')
    .description('Install branchos slash commands for Claude Code')
    .option('--uninstall', 'Remove installed slash commands')
    .action((options: { uninstall?: boolean }) => {
      const targetDir = path.join(os.homedir(), '.claude', 'commands');
      // ... same logic, using imported COMMANDS
    });
}
```

### Pattern 3: New Slash Commands (npx delegation)
**What:** New slash commands delegate to CLI handlers via `npx branchos` calls.
**When to use:** For create-workstream, list-workstreams, archive (commands that wrap CLI handlers).

Example `commands/branchos:create-workstream.md`:
```markdown
---
description: Create a new BranchOS workstream from current or specified branch
allowed-tools: Bash(npx branchos *)
---

# Create Workstream

Create a new BranchOS workstream for AI-assisted development.

```bash
npx branchos workstream create $ARGUMENTS
```

Options:
- `--name <name>`: Override auto-derived workstream ID
- `--feature <id>`: Link to a feature by ID (e.g., F-001)
- `--json`: Output in machine-readable JSON format

$ARGUMENTS
```

### Pattern 4: Consolidated Status Dashboard
**What:** The `/branchos:status` slash command calls multiple CLI commands to build a dashboard.
**When to use:** For the new status command that consolidates map-status + check-drift + detect-conflicts.

Example approach for `commands/branchos:status.md`:
```markdown
---
description: Show BranchOS dashboard with workstream status, map staleness, drift, and conflicts
allowed-tools: Bash(npx branchos *)
---

# BranchOS Status Dashboard

Run the following commands and present a consolidated dashboard:

## Workstream Status
```bash
npx branchos status --json $ARGUMENTS
```

## Codebase Map Staleness
```bash
npx branchos map-status --json
```

## Plan Drift (if active workstream)
```bash
npx branchos check-drift --json
```

## Cross-Workstream Conflicts
```bash
npx branchos detect-conflicts --all --json
```

Present the results as a unified dashboard with sections for each area.
$ARGUMENTS
```

**Note:** The underlying CLI handlers (`mapStatusHandler`, `checkDriftHandler`, `detectConflictsHandler`) remain in the codebase -- they are just not exposed as CLI commands. The slash command calls them via `npx branchos` which still works because those commands exist in the built binary. However, per the locked decision, CLI workflow commands should be removed. So the status slash command should instruct Claude to run the handlers directly or use a different approach.

**Revised approach:** Keep `map-status`, `check-drift`, `detect-conflicts` as internal CLI commands (not removed, just not documented/exposed), OR have the slash command instruct Claude to read state files directly and compute status.

**Recommended:** The simplest approach is to keep these 3 utility commands available in the CLI but remove them from help/documentation. The slash command calls them via `npx branchos` with `--json` flags. The "removed" workflow commands are the ones users previously ran directly: `workstream create`, `status`, `archive`, `discuss-phase`, `plan-phase`, `execute-phase`, `context`.

### Pattern 5: Init Auto-runs Install-commands
**What:** After `branchos init` sets up `.branchos/`, automatically run the install-commands logic.
**When to use:** One-command setup experience.

```typescript
// In initHandler, after successful init:
if (created.length > 0) {
  await git.addAndCommit(filesToAdd, 'chore: initialize branchos');
}

// Auto-install slash commands
installSlashCommands(); // extracted helper from install-commands action
```

### Anti-Patterns to Avoid
- **Runtime file resolution for .md files:** Do NOT use `fs.readFileSync` or `path.resolve` to find .md files at runtime. Bundle them at build time.
- **Importing from `commands/` without TypeScript declaration:** TypeScript will error on `.md` imports without a `declare module '*.md'` declaration.
- **Leaving dead code:** When removing CLI commands from index.ts, also remove the import statements. The handler modules (`src/cli/status.ts`, etc.) stay because the slash commands still need them via `npx branchos`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundling .md as strings | Custom build script to read .md files | tsup `loader: { '.md': 'text' }` | Native esbuild feature, zero config |
| File-watching in dev | Custom watcher for .md changes | tsup already watches; loader handles it | Works out of the box with `--watch` |

## Common Pitfalls

### Pitfall 1: Colons in Filenames on Windows
**What goes wrong:** Files named `branchos:status.md` may fail on Windows filesystems (NTFS disallows colons).
**Why it happens:** The existing pattern uses colons in slash command filenames.
**How to avoid:** This is already the established pattern in the project (see existing COMMANDS keys). The `commands/` source directory is only used at build time on dev machines. If Windows support is needed later, rename source files to use hyphens and map to colon-names in the export.
**Warning signs:** Build failures on Windows CI.

### Pitfall 2: TypeScript Module Resolution for .md Imports
**What goes wrong:** `import content from '../../commands/branchos:map-codebase.md'` causes TS2307.
**Why it happens:** TypeScript doesn't know how to resolve `.md` files.
**How to avoid:** Add a `src/commands/markdown.d.ts` (or similar) with `declare module '*.md' { const content: string; export default content; }`.
**Warning signs:** TypeScript compilation errors on .md imports.

### Pitfall 3: Forgetting to Keep Utility Handlers
**What goes wrong:** Removing CLI commands also removes the handler code that slash commands depend on.
**Why it happens:** Aggressive cleanup removes too much.
**How to avoid:** Only remove `register*Command` calls from `index.ts` and the CLI wrapper modules. Keep handler functions in `src/workstream/`, `src/phase/`, `src/map/` etc.
**Warning signs:** `npx branchos status --json` fails after migration.

### Pitfall 4: Version String in Multiple Places
**What goes wrong:** Version 2.0.0 needs updating in both `package.json` and `src/cli/index.ts` (`.version('1.2.0')`).
**Why it happens:** Version is hardcoded in two places.
**How to avoid:** Update both. Consider reading version from package.json (but that's a separate concern).
**Warning signs:** `branchos --version` shows old version.

### Pitfall 5: Status Slash Command Depends on Removed Commands
**What goes wrong:** `/branchos:status` calls `npx branchos map-status --json` but `map-status` was removed.
**Why it happens:** The decision says "remove all workflow commands" but status dashboard needs utility commands.
**How to avoid:** Keep `map-status`, `check-drift`, `detect-conflicts` registered in the CLI. They are utility/diagnostic commands, not workflow commands. The "workflow commands" to remove are: `workstream create`, `status`, `archive`, `discuss-phase`, `plan-phase`, `execute-phase`, `context`, `ingest-prfaq`, `plan-roadmap`, `features`, `sync-issues`, `refresh-roadmap`.
**Warning signs:** Status dashboard returns errors.

## Code Examples

### Complete tsup.config.ts
```typescript
// Source: esbuild docs + tsup docs
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  loader: {
    '.md': 'text',
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

### Commands Barrel Export
```typescript
// src/commands/index.ts
import mapCodebase from '../../commands/branchos:map-codebase.md';
import context from '../../commands/branchos:context.md';
import discussPhase from '../../commands/branchos:discuss-phase.md';
import planPhase from '../../commands/branchos:plan-phase.md';
import executePhase from '../../commands/branchos:execute-phase.md';
import ingestPrfaq from '../../commands/branchos:ingest-prfaq.md';
import planRoadmap from '../../commands/branchos:plan-roadmap.md';
import features from '../../commands/branchos:features.md';
import syncIssues from '../../commands/branchos:sync-issues.md';
import refreshRoadmap from '../../commands/branchos:refresh-roadmap.md';
import createWorkstream from '../../commands/branchos:create-workstream.md';
import listWorkstreams from '../../commands/branchos:list-workstreams.md';
import status from '../../commands/branchos:status.md';
import archive from '../../commands/branchos:archive.md';

export const COMMANDS: Record<string, string> = {
  'branchos:map-codebase.md': mapCodebase,
  'branchos:context.md': context,
  'branchos:discuss-phase.md': discussPhase,
  'branchos:plan-phase.md': planPhase,
  'branchos:execute-phase.md': executePhase,
  'branchos:ingest-prfaq.md': ingestPrfaq,
  'branchos:plan-roadmap.md': planRoadmap,
  'branchos:features.md': features,
  'branchos:sync-issues.md': syncIssues,
  'branchos:refresh-roadmap.md': refreshRoadmap,
  'branchos:create-workstream.md': createWorkstream,
  'branchos:list-workstreams.md': listWorkstreams,
  'branchos:status.md': status,
  'branchos:archive.md': archive,
};
```

### Stripped-Down CLI index.ts
```typescript
// src/cli/index.ts (after migration)
import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerInstallCommandsCommand } from './install-commands.js';

export const program = new Command();

program
  .name('branchos')
  .description('Branch-based AI-assisted development workflow management')
  .version('2.0.0');

// Bootstrapper commands only
registerInitCommand(program);
registerInstallCommandsCommand(program);

// Show help when no arguments provided
program.action(() => {
  program.help();
});
```

**Important consideration:** If `/branchos:status` needs to call `map-status`, `check-drift`, and `detect-conflicts` via `npx branchos`, those commands must remain registered. Options:

1. **Keep utility commands registered** (recommended): They aren't "workflow" commands -- they're diagnostic utilities. Users won't use them directly because they won't appear in slash commands.
2. **Make status slash command read files directly:** Have Claude read state files and compute status without CLI calls. More complex, less maintainable.

Recommended approach: Keep `registerMapStatusCommand`, `registerCheckDriftCommand`, `registerDetectConflictsCommand`, and `registerStatusCommand` in the CLI. The status slash command delegates to them. Only remove the commands that now have dedicated slash commands: workstream create, discuss-phase, plan-phase, execute-phase, context, ingest-prfaq, plan-roadmap, features, sync-issues, refresh-roadmap.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String literals in TS | .md files bundled via loader | Phase 10 | Easier to edit, syntax highlighting, version control diffs |
| CLI for all operations | Slash commands for workflow, CLI for bootstrap | Phase 10 | Better Claude Code integration |
| 15+ CLI commands | 2 CLI commands + 14 slash commands | Phase 10 | Cleaner separation of concerns |

## Open Questions

1. **Which CLI commands to actually remove vs keep?**
   - What we know: CONTEXT.md says "CLI retains only: init and install-commands"
   - What's unclear: Status dashboard needs map-status, check-drift, detect-conflicts as internal commands
   - Recommendation: Keep utility commands registered but don't list in help. OR, have the status slash command instruct Claude to use Read/Glob tools to compute status directly from state files (more self-contained but harder to maintain). Best: keep them registered, they're not user-facing workflow commands.

2. **Skills directory compatibility**
   - What we know: Success criteria says "Slash commands work in both `commands/` and `skills/` directories"
   - What's unclear: Whether install-commands should support writing to `~/.claude/skills/` as well
   - Recommendation: Add a `--skills` flag or auto-detect which directory Claude Code uses. For now, keep `~/.claude/commands/` as default (current behavior).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest built-in (no config file, uses package.json scripts) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01 | All .md files exist in commands/ directory | unit | `npx vitest run tests/commands/index.test.ts -t "exports all commands"` | No -- Wave 0 |
| MIGR-01 | COMMANDS record has 14 entries | unit | `npx vitest run tests/commands/index.test.ts -t "14 commands"` | No -- Wave 0 |
| MIGR-01 | Each command has valid YAML frontmatter | unit | `npx vitest run tests/commands/index.test.ts -t "frontmatter"` | No -- Wave 0 |
| MIGR-01 | install-commands writes all 14 files | unit | `npx vitest run tests/cli/install-commands.test.ts -t "installs"` | No -- Wave 0 |
| MIGR-02 | CLI only exposes init and install-commands | unit | `npx vitest run tests/cli/index.test.ts -t "only bootstrapper"` | No -- Wave 0 |
| MIGR-02 | Version is 2.0.0 | unit | `npx vitest run tests/cli/index.test.ts -t "version"` | No -- Wave 0 |
| MIGR-02 | init auto-runs install-commands | unit | `npx vitest run tests/cli/init.test.ts -t "auto-install"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/commands/index.test.ts` -- covers MIGR-01 (command count, frontmatter validation)
- [ ] `tests/cli/install-commands.test.ts` -- covers MIGR-01 (writes files correctly)
- [ ] `tests/cli/index.test.ts` -- covers MIGR-02 (only bootstrapper commands registered)
- [ ] TypeScript declaration file for `.md` imports

## Sources

### Primary (HIGH confidence)
- esbuild Content Types docs (https://esbuild.github.io/content-types/#text) -- text loader for .md files
- tsup type definitions (https://www.jsdocs.io/package/tsup) -- confirms `loader` option in Options type
- Existing codebase: `src/cli/install-commands.ts` -- current COMMANDS record pattern (730+ lines)
- Existing codebase: `src/cli/index.ts` -- current command registration pattern
- Existing codebase: `tsup.config.ts` -- current build configuration

### Secondary (MEDIUM confidence)
- esbuild-raw-plugin (https://github.com/react18-tools/esbuild-raw-plugin) -- alternative approach, not needed

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, using existing tsup/esbuild features
- Architecture: HIGH -- straightforward extraction and restructuring of existing code
- Pitfalls: HIGH -- based on direct analysis of existing codebase and known TypeScript/.md import patterns

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain, no fast-moving dependencies)
