# Phase 7: Roadmap Generation and Feature Registry - Research

**Researched:** 2026-03-10
**Domain:** Markdown generation, YAML frontmatter, CLI feature listing
**Confidence:** HIGH

## Summary

Phase 7 adds two new CLI commands (`plan-roadmap` and `features`) and a new `src/roadmap/` module for roadmap/feature types and utilities. The core technical work involves: (1) reading the ingested PR-FAQ from `.branchos/shared/PR-FAQ.md`, (2) generating a structured ROADMAP.md with milestones, (3) creating individual feature files with YAML frontmatter in `.branchos/shared/features/`, and (4) listing features with filtering.

The project has only 3 runtime dependencies (chalk, commander, simple-git) and a pattern of minimal dependency footprint. The YAML frontmatter format for feature files is simple and fixed (6 known fields), making hand-rolled parsing/serialization the right choice over adding gray-matter (which brings 4 transitive dependencies and is overkill for a known schema). The existing codebase already has markdown parsing utilities in `src/prfaq/hash.ts` (`splitIntoSections`) that demonstrate this approach.

**Primary recommendation:** Hand-roll YAML frontmatter parse/stringify for feature files (fixed schema, simple format), follow the `ingestPrfaqHandler` pattern for the `plan-roadmap` command, and create a pure `src/roadmap/` module for types and utilities separate from CLI concerns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Claude infers milestones from PR-FAQ content (groups related features by dependencies and logical phases)
- Features listed in suggested execution order within each milestone
- Dependencies noted inline with depends-on notation (e.g., "depends on: F-003")
- Roadmap lives at `.branchos/shared/ROADMAP.md`
- Includes summary header with project name, vision one-liner, total feature/milestone counts
- Inline progress tracking per milestone (e.g., "3/8 features complete"), updated as features progress
- Files stored in `.branchos/shared/features/` directory
- Sequential IDs: F-001, F-002, F-003
- Filename format: `F-001-user-auth.md` (ID + slug)
- YAML frontmatter: id, title, status, milestone, branch, issue
- Branch names derived as `feature/<slug>` (uses existing STRIP_PREFIXES constant)
- Acceptance criteria as markdown checklists (`- [ ] User can...`)
- Status lifecycle: unassigned -> assigned -> in-progress -> complete
- `/branchos:plan-roadmap` requires an ingested PR-FAQ (error if none: "Run /branchos:ingest-prfaq first")
- Generates draft, shows summary, asks user to confirm before committing
- Feature granularity: fine-grained, workstream-sized
- If ROADMAP.md already exists: warn and require `--force` flag to regenerate
- Auto-commit after user confirms (consistent with Phase 6 pattern)
- `/branchos:features` shows table with columns: ID, Title, Status, Milestone
- Supports `--status <value>` and `--milestone <value>` filtering flags
- Supports `--json` flag for machine-readable output
- `/branchos:features <id>` shows full detail view
- Status transitions are automatic from workstream events (Phase 8), no manual status command in this phase

### Claude's Discretion
- Exact milestone inference algorithm from PR-FAQ
- YAML frontmatter field ordering and optional fields
- Table formatting and column widths
- Summary confirmation prompt wording
- Feature slug generation from titles

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROAD-01 | User can generate ROADMAP.md from PR-FAQ via `/branchos:plan-roadmap` | CLI handler pattern from `ingest-prfaq.ts`, Commander registration pattern, slash command in `install-commands.ts` |
| ROAD-02 | Generated roadmap contains milestones with ordered features and dependencies | Markdown generation utilities, ROADMAP.md template structure |
| ROAD-03 | System generates individual feature files with acceptance criteria and branch names | YAML frontmatter serialization, feature file format, slug generation |
| FEAT-01 | Feature files use YAML frontmatter with markdown body | Hand-rolled YAML frontmatter parse/stringify utilities |
| FEAT-02 | Features follow status lifecycle: unassigned -> assigned -> in-progress -> complete | TypeScript enum/union type for status, frontmatter update utility |
| FEAT-03 | User can list all features with status, milestone, and branch via `/branchos:features` | CLI table formatting with chalk, filtering logic, `--json` flag pattern |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI command framework | Already used for all CLI commands |
| chalk | ^4.1.2 | Terminal output formatting | Already used for colored output |
| simple-git | ^3.27.0 | Git operations | Already used for auto-commit |

### Supporting (no new dependencies needed)
| Library | Purpose | Why No New Dependency |
|---------|---------|----------------------|
| Node.js `fs/promises` | File I/O for feature files | Built-in, already used throughout |
| Node.js `path` | Path construction | Built-in, already used |
| Node.js `crypto` | Content hashing (if needed) | Built-in, already used in `prfaq/hash.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled YAML frontmatter | gray-matter (npm) | gray-matter adds 4 transitive deps (js-yaml, kind-of, section-matter, strip-bom-string), last published 5 years ago. Feature files have a fixed 6-field schema -- hand-rolling is ~40 lines and keeps dependency count minimal |
| Hand-rolled table output | cli-table3 (npm) | Adds another dependency. chalk + string padding is sufficient for the simple 4-column table needed |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── roadmap/
│   ├── types.ts           # Feature, Milestone, RoadmapMeta, FeatureStatus types
│   ├── frontmatter.ts     # YAML frontmatter parse/stringify utilities
│   ├── feature-file.ts    # Read/write individual feature files
│   ├── roadmap-file.ts    # Read/write ROADMAP.md
│   └── slug.ts            # Title-to-slug conversion
├── cli/
│   ├── plan-roadmap.ts    # plan-roadmap command handler
│   └── features.ts        # features command handler
tests/
├── roadmap/
│   ├── frontmatter.test.ts
│   ├── feature-file.test.ts
│   ├── roadmap-file.test.ts
│   └── slug.test.ts
├── cli/
│   ├── plan-roadmap.test.ts
│   └── features.test.ts
```

### Pattern 1: Handler Pattern (from Phase 6)
**What:** Separate the handler function (pure logic + I/O) from Commander registration
**When to use:** All CLI commands
**Example:**
```typescript
// Source: src/cli/ingest-prfaq.ts (existing pattern)
export async function planRoadmapHandler(options: PlanRoadmapOptions): Promise<PlanRoadmapResult> {
  // 1. Validate preconditions (git repo, branchos init, PR-FAQ exists)
  // 2. Read PR-FAQ content
  // 3. Generate roadmap + features (this is where Claude infers from PR-FAQ)
  // 4. Show summary, prompt confirmation
  // 5. Write files
  // 6. Auto-commit
  return result;
}

export function registerPlanRoadmapCommand(program: Command): void {
  program
    .command('plan-roadmap')
    .description('Generate roadmap and features from ingested PR-FAQ')
    .option('--json', 'Output in JSON format', false)
    .option('--force', 'Overwrite existing roadmap without confirmation', false)
    .action(async (opts) => {
      const result = await planRoadmapHandler({ json: opts.json, force: opts.force });
      if (!result.success) process.exit(1);
    });
}
```

### Pattern 2: YAML Frontmatter Parse/Stringify
**What:** Simple utilities for the fixed feature file format
**When to use:** Reading and writing feature files
**Example:**
```typescript
// Hand-rolled for fixed schema -- no external dependency needed
export interface FeatureFrontmatter {
  id: string;
  title: string;
  status: FeatureStatus;
  milestone: string;
  branch: string;
  issue: number | null;
}

export function parseFrontmatter(content: string): { data: FeatureFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Invalid frontmatter format');

  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      data[key] = val;
    }
  }

  return {
    data: {
      id: data.id,
      title: data.title,
      status: data.status as FeatureStatus,
      milestone: data.milestone,
      branch: data.branch,
      issue: data.issue && data.issue !== 'null' ? parseInt(data.issue, 10) : null,
    },
    body: match[2].trim(),
  };
}

export function stringifyFrontmatter(data: FeatureFrontmatter, body: string): string {
  const lines = [
    '---',
    `id: ${data.id}`,
    `title: ${data.title}`,
    `status: ${data.status}`,
    `milestone: ${data.milestone}`,
    `branch: ${data.branch}`,
    `issue: ${data.issue ?? 'null'}`,
    '---',
    '',
    body,
  ];
  return lines.join('\n') + '\n';
}
```

### Pattern 3: Slug Generation
**What:** Convert feature titles to URL/filename-safe slugs
**When to use:** Generating feature filenames and branch names
**Example:**
```typescript
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50); // Cap length for filename/branch sanity
}

// Feature filename: F-001-user-auth.md
export function featureFilename(id: string, title: string): string {
  return `${id}-${slugify(title)}.md`;
}

// Branch name: feature/user-auth
export function featureBranch(title: string): string {
  return `feature/${slugify(title)}`;
}
```

### Pattern 4: Table Formatting with Chalk
**What:** Simple padded columns for terminal output
**When to use:** `/branchos:features` listing
**Example:**
```typescript
function formatTable(features: Feature[]): string {
  const headers = ['ID', 'Title', 'Status', 'Milestone'];
  const rows = features.map(f => [f.id, f.title, f.status, f.milestone]);

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length))
  );

  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  const separator = widths.map(w => '-'.repeat(w)).join('  ');
  const dataLines = rows.map(r => r.map((c, i) => c.padEnd(widths[i])).join('  '));

  return [headerLine, separator, ...dataLines].join('\n');
}
```

### Anti-Patterns to Avoid
- **Putting generation logic in CLI handler:** Keep the roadmap/feature generation logic in `src/roadmap/` as pure functions. The CLI handler orchestrates I/O and user interaction only.
- **Hardcoding paths:** Use `BRANCHOS_DIR` and `SHARED_DIR` constants for path construction, just like Phase 6 does.
- **Forgetting --force guard:** The `plan-roadmap` command must check for existing ROADMAP.md and error without `--force`. This is a locked decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git operations | Custom git CLI wrappers | `GitOps` class (existing) | Already handles edge cases, tested |
| CLI argument parsing | Custom arg parser | Commander (existing) | Already the standard in the project |
| Terminal colors | ANSI escape codes | chalk (existing) | Cross-platform, already imported |

**Key insight:** For this phase, all "don't hand-roll" items are already solved by existing project infrastructure. The YAML frontmatter IS worth hand-rolling because the schema is fixed and simple, avoiding a dependency for ~40 lines of code.

## Common Pitfalls

### Pitfall 1: Feature ID Collisions on Regeneration
**What goes wrong:** If `--force` regeneration creates new IDs that conflict with manually-edited feature files
**Why it happens:** Sequential ID generation (F-001, F-002) starts from scratch on regeneration
**How to avoid:** When `--force` is used and features/ directory exists, clear all existing feature files before writing new ones. Document this destructive behavior clearly in the confirmation prompt.
**Warning signs:** Feature files with duplicate IDs in the directory

### Pitfall 2: YAML Frontmatter Values Containing Colons
**What goes wrong:** A title like "Auth: OAuth2 Flow" breaks naive `key: value` parsing
**Why it happens:** Only splitting on first colon, but the value itself contains colons
**How to avoid:** Split only on the FIRST colon. The parse function above already handles this correctly with `line.indexOf(':')` and `line.slice(idx + 1)`.
**Warning signs:** Parsing errors or truncated titles

### Pitfall 3: Multiline YAML Values
**What goes wrong:** If any frontmatter value contains newlines, the simple parser breaks
**Why it happens:** Simple line-by-line parsing assumes one field per line
**How to avoid:** For this schema, all fields are single-line strings, numbers, or null. Enforce this constraint in the type system. Titles should never contain newlines.
**Warning signs:** Feature files that fail to parse

### Pitfall 4: Slash Command Size in install-commands.ts
**What goes wrong:** The plan-roadmap slash command content is complex (it needs to instruct Claude to read PR-FAQ and generate a roadmap), adding significant string literal bulk
**Why it happens:** All slash commands are stored as string literals in one file
**How to avoid:** Keep the slash command content focused and concise. The existing concern about string literal size (noted in STATE.md blockers) is deferred to Phase 10.
**Warning signs:** install-commands.ts exceeding readable size

### Pitfall 5: Feature File Directory Not Existing
**What goes wrong:** Writing to `.branchos/shared/features/` fails if directory doesn't exist
**Why it happens:** First-time generation, directory was never created
**How to avoid:** Use `mkdir(dir, { recursive: true })` before writing feature files, same as the init command does for `.branchos/shared/`.
**Warning signs:** ENOENT errors on first run

## Code Examples

### Reading PR-FAQ Metadata (checking prerequisite)
```typescript
// Source: src/prfaq/hash.ts (existing)
import { readMeta } from '../prfaq/hash.js';

const meta = await readMeta(sharedDir);
if (!meta) {
  errorOutput('No PR-FAQ found. Run /branchos:ingest-prfaq first.', { json: false });
  return { success: false, error: 'No PR-FAQ ingested' };
}
```

### Auto-commit Pattern (from Phase 6)
```typescript
// Source: src/cli/ingest-prfaq.ts (existing pattern)
const filesToCommit = [
  '.branchos/shared/ROADMAP.md',
  ...featureFiles.map(f => `.branchos/shared/features/${f}`),
];
await git.addAndCommit(filesToCommit, 'chore: generate roadmap and features');
```

### Feature File Example Output
```markdown
---
id: F-001
title: User Authentication
status: unassigned
milestone: M1 - Core Infrastructure
branch: feature/user-authentication
issue: null
---

# User Authentication

## Acceptance Criteria

- [ ] User can register with email and password
- [ ] User can log in and receive a session token
- [ ] User can log out and invalidate their session
- [ ] Invalid credentials return a clear error message
```

### ROADMAP.md Example Output
```markdown
# Roadmap: Project Name

> Vision one-liner from PR-FAQ

**Milestones:** 3 | **Features:** 12

---

## M1: Core Infrastructure (0/4 features complete)

| # | Feature | Status | Depends On |
|---|---------|--------|------------|
| F-001 | User Authentication | unassigned | -- |
| F-002 | Database Schema | unassigned | -- |
| F-003 | API Gateway | unassigned | F-001 |
| F-004 | Permission System | unassigned | F-001, F-002 |

## M2: User Experience (0/5 features complete)

| # | Feature | Status | Depends On |
|---|---------|--------|------------|
| F-005 | Dashboard UI | unassigned | F-003 |
...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gray-matter for all frontmatter | Hand-roll for fixed schemas | Always valid for simple cases | Avoids unnecessary dependency |
| Complex table libraries | Simple padded columns | N/A | Sufficient for 4-column tables |

**Deprecated/outdated:** N/A -- this phase uses established patterns.

## Open Questions

1. **Slash command architecture for plan-roadmap**
   - What we know: The plan-roadmap slash command must instruct Claude to read PR-FAQ and generate structured output. This is different from ingest-prfaq which just calls a CLI command.
   - What's unclear: Whether the slash command should call `npx branchos plan-roadmap` (which then does file I/O) or whether it should be a Claude-driven workflow that reads PR-FAQ and writes files directly.
   - Recommendation: Make it a CLI command (`npx branchos plan-roadmap`) for consistency, but the actual roadmap/feature content generation happens at the prompt/slash-command level since it requires AI inference from PR-FAQ content. The CLI command handles validation, file writing, and git commit. The slash command provides the generation instructions.

2. **AI-driven generation vs deterministic**
   - What we know: "Claude infers milestones from PR-FAQ content" is a locked decision. This means the roadmap content cannot be generated by a deterministic algorithm.
   - What's unclear: How the CLI command triggers AI generation. Options: (a) the slash command IS the generation pipeline (reads PR-FAQ, generates, writes), (b) the CLI command provides a scaffold and the slash command fills it in.
   - Recommendation: The slash command (`/branchos:plan-roadmap`) should be the primary interface. It reads the PR-FAQ, generates the roadmap and features using Claude's inference, then writes files and commits. The CLI command (`npx branchos plan-roadmap`) can serve as a validation/listing tool but the actual generation is AI-driven through the slash command. This matches Phase 6 where `ingest-prfaq` is both a CLI command AND a slash command.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, from devDependencies) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/roadmap/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROAD-01 | plan-roadmap handler validates prereqs and writes ROADMAP.md | unit | `npx vitest run tests/cli/plan-roadmap.test.ts -x` | Wave 0 |
| ROAD-02 | Generated roadmap contains milestones with ordered features | unit | `npx vitest run tests/roadmap/roadmap-file.test.ts -x` | Wave 0 |
| ROAD-03 | Feature files generated with acceptance criteria and branches | unit | `npx vitest run tests/roadmap/feature-file.test.ts -x` | Wave 0 |
| FEAT-01 | YAML frontmatter parse/stringify round-trips correctly | unit | `npx vitest run tests/roadmap/frontmatter.test.ts -x` | Wave 0 |
| FEAT-02 | Status lifecycle validation (valid transitions) | unit | `npx vitest run tests/roadmap/types.test.ts -x` | Wave 0 |
| FEAT-03 | features command lists/filters features correctly | unit | `npx vitest run tests/cli/features.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/roadmap/ tests/cli/plan-roadmap.test.ts tests/cli/features.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/roadmap/frontmatter.test.ts` -- covers FEAT-01 (parse/stringify)
- [ ] `tests/roadmap/feature-file.test.ts` -- covers ROAD-03 (feature file read/write)
- [ ] `tests/roadmap/roadmap-file.test.ts` -- covers ROAD-02 (roadmap generation)
- [ ] `tests/roadmap/slug.test.ts` -- covers slug generation for filenames/branches
- [ ] `tests/cli/plan-roadmap.test.ts` -- covers ROAD-01 (handler validation)
- [ ] `tests/cli/features.test.ts` -- covers FEAT-03 (listing/filtering)

## Sources

### Primary (HIGH confidence)
- Project source code: `src/cli/ingest-prfaq.ts`, `src/prfaq/types.ts`, `src/prfaq/hash.ts` -- established patterns
- Project source code: `src/cli/index.ts`, `src/cli/install-commands.ts` -- registration patterns
- Project source code: `src/constants.ts` -- path constants
- Project source code: `src/output/index.ts` -- output formatting patterns
- Project source code: `src/git/index.ts` -- GitOps class
- Project source code: `tests/cli/ingest-prfaq.test.ts` -- test patterns with mocked GitOps

### Secondary (MEDIUM confidence)
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) -- YAML frontmatter library evaluation
- [npm comparison](https://npm-compare.com/front-matter,gray-matter,yaml-front-matter) -- frontmatter library ecosystem

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established in Phase 6
- Architecture: HIGH -- follows exact same handler pattern as ingest-prfaq
- Pitfalls: HIGH -- identified from code review and established patterns
- YAML frontmatter approach: HIGH -- simple fixed schema, ~40 lines vs adding dependency

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain, no fast-moving dependencies)
