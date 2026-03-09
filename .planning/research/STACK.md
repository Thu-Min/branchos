# Stack Research

**Domain:** CLI tool - project planning layer additions (PR-FAQ, roadmap, feature registry, GitHub Issues sync)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Existing Stack (DO NOT CHANGE)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=20 | Runtime |
| TypeScript | ^5.5.0 | Type safety |
| Commander | ^12.1.0 | CLI framework |
| simple-git | ^3.27.0 | Git operations |
| chalk | ^4.1.2 | Terminal output (CJS-compatible v4) |
| tsup | ^8.3.0 | Build (CJS output) |
| vitest | ^3.0.0 | Testing |

The existing stack is validated and shipping. v2 adds a project-level planning layer on top. This document covers ONLY what changes.

## Recommended Additions

### New Runtime Dependency: gray-matter

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| gray-matter | ^4.0.3 | YAML frontmatter parsing for markdown files | Battle-tested (used by Astro, VitePress, Gatsby, TinaCMS, Shopify Polaris). Parses frontmatter into structured data and separates content body. Exactly what is needed for PR-FAQ.md, ROADMAP.md, and feature registry files. |

**What it does for BranchOS v2:**
- Parse `PR-FAQ.md` frontmatter (version, lastModified, contentHash) + body content
- Parse feature registry files (`features/<id>.md`) with structured metadata (id, milestone, status, issue number, acceptance criteria flags)
- Parse `ROADMAP.md` frontmatter (version, milestones count)
- Write structured markdown with frontmatter via `matter.stringify(content, data)`

**Why gray-matter over alternatives:**
- `front-matter` npm: Last published 6+ years ago, effectively abandoned
- `remark-frontmatter`: Requires the entire unified/remark ecosystem (30+ transitive deps) for AST parsing BranchOS does not need. Remark is for transforming markdown ASTs; BranchOS just reads/writes structured markdown.
- Custom YAML regex: Fragile, edge-case-prone, wastes time on a solved problem
- gray-matter is CJS, which works with BranchOS's tsup CJS build output (`dist/index.cjs`)

**Integration pattern:**
```typescript
import matter from 'gray-matter';

// Parse a feature file
const raw = await readFile('.branchos/shared/features/auth-system.md', 'utf-8');
const { data, content } = matter(raw);
// data = { id: 'auth-system', milestone: 'M1', status: 'unassigned', issue: null }
// content = markdown body with description, acceptance criteria, etc.

// Write a feature file with frontmatter
const output = matter.stringify(markdownBody, { id: 'auth-system', milestone: 'M1', status: 'assigned' });
await writeFile('.branchos/shared/features/auth-system.md', output);
```

### New Dev Dependency: @types/gray-matter

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @types/gray-matter | latest | TypeScript type definitions | gray-matter does not ship built-in TS declarations. Required for type-safe usage. |

## Decisions: What NOT to Add (and Why)

### GitHub Issues Sync: Use `gh` CLI, NOT @octokit/rest

**Decision: Shell out to `gh` CLI via `child_process`.**

| Approach | Verdict | Rationale |
|----------|---------|-----------|
| `gh` CLI via child_process | USE THIS | Consistent with project architecture (slash commands already shell out). Zero new deps. Auth handled by `gh auth`. |
| `@octokit/rest` | Do not use | Adds ~15 transitive deps. Requires token management. Duplicates `gh` functionality. Over-engineered for CRUD on issues. |

**Why `gh` CLI fits BranchOS:**
1. BranchOS already shells out to `git` via simple-git and to `npx` in slash commands -- this is an established pattern
2. Users of a git workflow tool will have `gh` installed (or can install it trivially)
3. The operations are simple CRUD: create issue, update issue, list issues, add labels, set milestones
4. `gh` handles auth, rate limiting, and pagination automatically
5. Failing gracefully when `gh` is not installed is straightforward (`which gh` check)
6. JSON output from `gh --json` makes parsing trivial

**Integration pattern:**
```typescript
import { execSync } from 'child_process';

function ghAvailable(): boolean {
  try {
    execSync('which gh', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function createIssue(repo: string, title: string, body: string, labels: string[]): string {
  const labelFlags = labels.map(l => `--label "${l}"`).join(' ');
  const result = execSync(
    `gh issue create --repo ${repo} --title "${title}" --body-file - ${labelFlags}`,
    { input: body, encoding: 'utf-8' }
  );
  return result.trim(); // returns issue URL
}

function listIssues(repo: string): Issue[] {
  const json = execSync(
    `gh issue list --repo ${repo} --json number,title,state,labels --limit 200`,
    { encoding: 'utf-8' }
  );
  return JSON.parse(json);
}
```

### Change Detection: Use Node.js `crypto`, NOT an External Library

**Decision: `crypto.createHash('sha256')` from Node.js stdlib.**

Content hashing for PR-FAQ change detection requires no external library.

```typescript
import { createHash } from 'crypto';

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}
// Store hash in frontmatter, compare on next read
// Hash mismatch -> PR-FAQ changed -> prompt roadmap refresh
```

### Markdown Section Parsing: Custom String Splitting, NOT a Parser Library

BranchOS reads and writes its own markdown with known, controlled structure. The existing codebase already builds markdown sections from raw strings (see `src/context/assemble.ts`). This pattern extends naturally.

**Why no markdown parser:**
- Section extraction is string splitting on `## ` headers -- reliable for controlled formats
- A full AST parser (remark, markdown-it, marked) adds deps and complexity for zero benefit
- BranchOS never renders markdown to HTML
- The v1 codebase proves this approach works at scale

```typescript
function extractSection(markdown: string, heading: string): string | null {
  const regex = new RegExp(`^## ${heading}\\s*$`, 'm');
  const match = regex.exec(markdown);
  if (!match) return null;
  const start = match.index + match[0].length;
  const nextHeading = markdown.indexOf('\n## ', start);
  return markdown.slice(start, nextHeading === -1 ? undefined : nextHeading).trim();
}
```

### Schema Validation: TypeScript Interfaces, NOT Zod

The v1 research recommended Zod but v1 shipped without it -- using TypeScript interfaces with manual validation and the chained schema migration system. This works well. Do not introduce Zod now.

**Why stay with TypeScript interfaces:**
- v1's pattern is proven: `WorkstreamState` interface + `migrateIfNeeded()` + `JSON.parse()` with typed assertions
- Feature registry files have simple schemas (5-8 fields in frontmatter)
- gray-matter returns `data` as `Record<string, any>` -- a simple type guard function is sufficient
- Adding Zod mid-project creates inconsistency between v1 state (no Zod) and v2 state (Zod)

### No File Watcher Needed

BranchOS uses explicit commands, not file watching. PR-FAQ change detection is hash-based and runs on command invocation (`/branchos:refresh-roadmap`), not in real-time. Do not add chokidar, watchpack, or similar.

### No Interactive Prompt Library Needed

Slash commands run inside Claude Code conversations. There is no interactive terminal. Do not add inquirer, prompts, or @clack/prompts. All user interaction flows through Claude Code's natural language interface.

### No Template Engine Needed

Markdown generation uses template literal strings. Do not add handlebars, ejs, mustache, or similar. String interpolation is the right level of abstraction for generating structured markdown.

## Installation

```bash
# New runtime dependency (the ONLY new dep)
npm install gray-matter

# New dev dependency
npm install -D @types/gray-matter
```

One new runtime dependency. Everything else uses Node.js built-ins or existing tools (`gh` CLI, `git`).

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@octokit/rest` or `octokit` | 15+ transitive deps, token management complexity, duplicates `gh` CLI | Shell out to `gh` CLI |
| `remark` / `unified` / `remark-parse` | 30+ packages for AST parsing not needed | gray-matter + string splitting |
| `markdown-it` or `marked` | HTML rendering; BranchOS never renders markdown | gray-matter + string splitting |
| `js-yaml` directly | gray-matter uses js-yaml internally; importing both creates version risk | Use gray-matter's parsed output |
| `chokidar` / file watchers | Explicit commands, not real-time watching | Content hash on command invocation |
| `inquirer` / `prompts` / `@clack/prompts` | No interactive terminal; runs inside Claude Code | Claude Code conversation flow |
| `zod` / `joi` / `ajv` | Inconsistent with v1 patterns; simple schemas don't justify it | TypeScript interfaces + type guards |
| `handlebars` / `ejs` | Template engines for string concatenation is overkill | Template literal strings |
| `glob` / `fast-glob` | Node.js 22+ has `fs.glob`; for Node 20, `fs.readdir` is sufficient for `.branchos/shared/features/` | `fs.readdir` + `path.extname` filter |

## Dependency Impact

| Metric | v1 (current) | v2 (after additions) |
|--------|-------------|---------------------|
| Runtime deps | 3 (commander, simple-git, chalk) | 4 (+gray-matter) |
| Transitive runtime deps | ~20 | ~25 (gray-matter adds js-yaml, strip-bom, section-matter, kind-of) |
| Dev deps | 5 (@types/node, tsup, tsx, typescript, vitest) | 6 (+@types/gray-matter) |
| External tool deps | git | git, gh (optional -- for Issues sync only) |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| gray-matter@^4.0.3 | Node.js >=20 | CJS package. Works with tsup CJS build. Uses js-yaml@^3.x internally. |
| gray-matter@^4.0.3 | TypeScript ^5.5.0 | Requires @types/gray-matter for declarations. |
| gray-matter@^4.0.3 | tsup ^8.3.0 | Standard CJS require resolution, no special config. |
| `gh` CLI | Any recent version | JSON output format (`--json`) is stable. Minimum ~2.0 for `--json` flag support. |

## Stack Patterns by v2 Feature

**PR-FAQ Ingestion:**
- gray-matter parses frontmatter metadata (version, contentHash, lastModified)
- Content body stored as plain markdown
- `crypto.createHash('sha256')` generates content fingerprint stored in frontmatter
- Change detection: compare stored hash vs computed hash on `/branchos:refresh-roadmap`

**Roadmap Generation:**
- Output is markdown with YAML frontmatter, written via `matter.stringify()`
- Claude Code generates content via slash command; BranchOS provides structure and validation
- No generation library needed

**Feature Registry:**
- Each feature is a markdown file with YAML frontmatter in `.branchos/shared/features/`
- gray-matter parses structured data (id, milestone, status, branch, issue)
- `fs.readdir` lists feature files; gray-matter parses each
- Simple type guard validates frontmatter shape

**GitHub Issues Sync:**
- `gh issue create` / `gh issue edit` / `gh issue list` via `child_process.execSync`
- `--json` flag for structured output, parsed with `JSON.parse()`
- Graceful degradation: warn and skip if `gh` not installed
- Owner/repo from `git remote get-url origin` (already available via simple-git)

**Slash-Command-Only Migration:**
- No new deps. Existing `install-commands.ts` COMMANDS record pattern extends naturally.
- New slash command .md files added to the record
- CLI commands that move to slash-only get removed from Commander registration
- `branchos init` and `branchos install-commands` remain as CLI commands (bootstrapping)

## Sources

- [gray-matter npm](https://www.npmjs.com/package/gray-matter) -- version 4.0.3, high weekly downloads (MEDIUM confidence, npm data)
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) -- feature set, used-by list confirms wide adoption (HIGH confidence, official repo)
- [npm trends comparison](https://npmtrends.com/front-matter-vs-gray-matter-vs-markdown-it-vs-marked-vs-remark-frontmatter-vs-remarkable) -- gray-matter leads for frontmatter-specific parsing (MEDIUM confidence)
- [Octokit REST.js GitHub](https://github.com/octokit/rest.js/) -- evaluated and rejected for this use case (HIGH confidence, official repo)
- [GitHub REST API quickstart](https://docs.github.com/en/rest/quickstart) -- confirms `gh` CLI as valid integration path (HIGH confidence, official docs)
- [Node.js crypto docs](https://nodejs.org/api/crypto.html) -- createHash API for Node.js 20+ (HIGH confidence, official docs)
- Existing BranchOS source: `src/context/assemble.ts`, `src/state/state.ts`, `src/cli/install-commands.ts` -- confirmed patterns for string-based markdown, file I/O, shell-out architecture (HIGH confidence, primary source)

---
*Stack research for: BranchOS v2 project-level planning layer*
*Researched: 2026-03-09*
