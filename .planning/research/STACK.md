# Stack Research

**Domain:** Interactive research slash commands for BranchOS v2.1
**Researched:** 2026-03-11
**Confidence:** HIGH

## Existing Stack (DO NOT CHANGE)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=20 | Runtime |
| TypeScript | ^5.5.0 | Type safety |
| Commander | ^12.1.0 | CLI framework (bootstrapper only) |
| simple-git | ^3.27.0 | Git operations |
| chalk | ^4.1.2 | Terminal output (CJS-compatible v4) |
| tsup | ^8.3.0 | Build (CJS output) |
| vitest | ^3.0.0 | Testing |

The existing stack shipped v2.0 with 10,870 LOC. v2.1 adds interactive research capabilities. This document covers ONLY what changes.

## Recommended Additions

### Zero New Runtime Dependencies

**The critical architectural insight: interactive research requires no new libraries.**

BranchOS slash commands are markdown instruction files that Claude Code executes. "Interactive research" means writing a slash command that instructs Claude Code to:

1. Conduct conversational research using its built-in tools (WebSearch, WebFetch, Read, Grep, Glob)
2. Store findings as markdown artifacts in `.branchos/`
3. Track research sessions in workstream state

Every capability needed already exists in the runtime:

| Capability | How It Works | Library Needed |
|------------|-------------|----------------|
| Conversational back-and-forth | Claude Code's natural conversation loop | None -- it is the host environment |
| Web search | Claude Code's built-in `WebSearch` tool | None -- declared in `allowed-tools` |
| Web fetching | Claude Code's built-in `WebFetch` tool | None -- declared in `allowed-tools` |
| Research artifact storage | `fs.writeFile` to `.branchos/` paths | None -- Node.js built-in |
| YAML frontmatter on artifacts | Hand-rolled parser (proven in v2.0) | None -- `src/roadmap/frontmatter.ts` pattern |
| State tracking | JSON read/write to `state.json` | None -- existing pattern |
| Git commit of artifacts | `simple-git` (already a dependency) | None -- already present |

### Slash Command Tool Access

The research slash command needs these `allowed-tools` in its frontmatter:

```yaml
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Bash(npx branchos *), Bash(git *)
```

This is the first BranchOS slash command to use `WebSearch` and `WebFetch`. These are Claude Code built-in tools -- no installation, no API keys from BranchOS's side. Claude Code handles authentication and rate limiting.

**Important constraint:** `WebSearch` and `WebFetch` availability depends on the user's Claude Code plan and configuration. The slash command should degrade gracefully if these tools are unavailable (instruct Claude to note when web research was not possible and proceed with training knowledge).

## Architecture Decisions for v2.1

### Research Artifact Format: Markdown with Frontmatter

Use the same hand-rolled frontmatter pattern from `src/roadmap/frontmatter.ts`, extended with a research-specific type.

```typescript
// New type alongside FeatureFrontmatter
export interface ResearchFrontmatter {
  id: string;          // e.g., "R-001"
  topic: string;       // research topic/question
  status: 'in-progress' | 'complete';
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
  sources: number;     // count of cited sources
}
```

**Why reuse the hand-rolled parser:**
- v2.0 explicitly chose hand-rolled over gray-matter (see KEY DECISIONS in PROJECT.md)
- The parser is proven, tested, zero-dep
- Research frontmatter has simple flat fields -- no nested YAML, no arrays
- Consistency: all BranchOS frontmatter uses the same parser

**Storage location:** `.branchos/shared/research/R-NNN-<slug>.md`

This mirrors the feature registry pattern (`.branchos/shared/features/F-NNN-<slug>.md`) and keeps research artifacts in the shared layer (visible to all workstreams).

### Research State Tracking: Extend Existing Patterns

Two options for tracking research sessions:

**Option A (recommended): File-based tracking only.** Research artifacts exist as files in `.branchos/shared/research/`. Listing research = reading the directory. Status = reading frontmatter. No state.json changes needed.

**Why Option A:** The feature registry already works this way -- features are tracked by their files, not by entries in state.json. Research follows the same pattern. This avoids a schema migration (v2 -> v3) for the workstream state file.

**Option B (rejected): Add research array to state.json.** Would require schema migration, adds complexity, and the file-based approach is proven.

### Research Session Flow: Slash Command Orchestration

The slash command instructs Claude Code to follow a multi-step research flow. No orchestration library or state machine is needed -- the slash command markdown IS the orchestration.

```
User runs /branchos:research "authentication patterns for Node.js APIs"
  -> Claude Code reads the slash command instructions
  -> Claude Code uses WebSearch/WebFetch to research
  -> Claude Code has a back-and-forth with the user (natural conversation)
  -> Claude Code writes findings to .branchos/shared/research/R-001-auth-patterns.md
  -> Claude Code commits via git
```

The "conversational" aspect is inherent in Claude Code. The slash command just needs to:
1. Tell Claude Code what to do
2. Provide the output format
3. Specify where to store results

### Context Assembly Integration

Research artifacts should be includable in context packets. Extend `AssemblyInput`:

```typescript
// Add to AssemblyInput
researchContext: string | null;  // concatenated research summaries relevant to current work
```

The context command can read `.branchos/shared/research/` and include relevant research based on topic matching or explicit linking (e.g., feature files could reference research IDs).

### No CLI Command Needed

Research is a slash-command-only workflow. No `branchos research` CLI command. This is consistent with the v2.0 decision to make CLI a bootstrapper only.

The only CLI-side work is:
1. Add the new slash command `.md` file to the COMMANDS record
2. Extend the frontmatter parser to handle `ResearchFrontmatter`
3. Optionally extend context assembly to include research

## What NOT to Add (and Why)

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `inquirer` / `prompts` / `@clack/prompts` | No interactive terminal -- runs inside Claude Code | Claude Code's natural conversation |
| `axios` / `node-fetch` / `got` | Web fetching is Claude Code's job via WebFetch tool | `allowed-tools: WebFetch` in slash command |
| `cheerio` / `jsdom` / `puppeteer` | Web scraping is Claude Code's job via WebFetch | `allowed-tools: WebFetch` in slash command |
| `langchain` / `llamaindex` / AI SDKs | Claude Code IS the AI -- no need to call AI APIs from BranchOS | Slash command instructions |
| `gray-matter` | v2.0 shipped without it; hand-rolled parser is proven and zero-dep | Extend existing `frontmatter.ts` |
| `zod` / `joi` | v2.0 decision: TypeScript interfaces + type guards | Same pattern as `FeatureFrontmatter` |
| `lowdb` / `sqlite3` / any database | File-based storage is the architecture -- research = markdown files | `fs.readFile` / `fs.writeFile` |
| `fuse.js` / search libraries | Research lookup is simple directory listing + frontmatter reading | `fs.readdir` + `parseFrontmatter` |
| `marked` / `markdown-it` / `remark` | BranchOS never renders markdown to HTML | String manipulation |
| `chokidar` / file watchers | Explicit commands, not real-time | On-demand file reads |

## Installation

```bash
# No new dependencies needed for v2.1
# The existing stack handles everything
```

Zero new runtime dependencies. Zero new dev dependencies. The research feature is built entirely with:
- Existing Node.js built-ins (`fs`, `path`, `crypto`)
- Existing dependencies (`simple-git`, `chalk`)
- Existing patterns (frontmatter parser, file-based state, slash command orchestration)
- Claude Code's built-in tools (`WebSearch`, `WebFetch`)

## Dependency Impact

| Metric | v2.0 (current) | v2.1 (after additions) |
|--------|----------------|------------------------|
| Runtime deps | 3 (commander, simple-git, chalk) | 3 (unchanged) |
| Dev deps | 5 (@types/node, tsup, tsx, typescript, vitest) | 5 (unchanged) |
| External tool deps | git, gh (optional) | git, gh (optional) -- unchanged |
| New source files | -- | ~3-5 (research types, frontmatter extension, slash command, context integration) |

## Stack Patterns for v2.1 Features

**Research Slash Command:**
- Markdown instruction file in `commands/branchos:research.md`
- Uses `$ARGUMENTS` for research topic
- Declares `WebSearch` and `WebFetch` in `allowed-tools`
- Instructs Claude Code on conversational research flow and output format
- Shells out to `npx branchos` only for state operations (if any)

**Research Artifact Storage:**
- Files at `.branchos/shared/research/R-NNN-<slug>.md`
- YAML frontmatter via extended hand-rolled parser
- Body contains findings, sources, recommendations
- Auto-committed to git (same pattern as discuss.md, features)

**Research-to-Context Pipeline:**
- Research artifacts readable by `/branchos:context` command
- Included in context packets when relevant to current workstream
- Simple: read directory, parse frontmatter, filter by topic/milestone

**Research Listing:**
- New slash command `/branchos:list-research` (or extend `/branchos:features` to show research)
- Reads `.branchos/shared/research/`, parses frontmatter, displays table
- Same pattern as feature listing

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Claude Code WebSearch | Brave Search API via CLI tool | If user has Brave API key and wants independent search index. Could be mentioned in slash command as optional enhancement. |
| File-based research storage | SQLite via better-sqlite3 | Never for BranchOS. File-based is the core architecture. SQLite would break git-committed artifacts. |
| Hand-rolled frontmatter | gray-matter | If frontmatter needs become complex (nested YAML, arrays). Current research metadata is flat -- no need. |
| Single research command | Separate research-start / research-continue / research-finish | If research sessions span multiple Claude Code sessions. For v2.1, single-session research is sufficient. Multi-session can be added later by checking for existing in-progress research files. |

## Version Compatibility

No new packages means no new compatibility concerns. The existing stack compatibility from v2.0 remains unchanged.

| Existing Package | Status | Notes |
|------------------|--------|-------|
| Node.js >=20 | Compatible | `fs/promises`, `crypto`, `path` -- all stable APIs used |
| TypeScript ^5.5.0 | Compatible | No new type features needed |
| tsup ^8.3.0 | Compatible | No build config changes |
| vitest ^3.0.0 | Compatible | New test files follow existing patterns |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WebSearch/WebFetch unavailable in user's Claude Code | LOW | MEDIUM -- research degrades to training knowledge only | Slash command includes fallback instructions |
| Research artifacts grow large | LOW | LOW -- they're markdown files | Keep summaries concise; detail in sources section |
| Frontmatter parser needs arrays (e.g., tags) | MEDIUM | LOW -- easy to add | Extend parser when needed; still no gray-matter required |
| Multi-session research needed | MEDIUM | LOW | v2.1 starts single-session; in-progress status enables future multi-session |

## Sources

- Existing BranchOS source: `src/roadmap/frontmatter.ts` -- hand-rolled YAML parser, proven in v2.0 (HIGH confidence, primary source)
- Existing BranchOS source: `src/context/assemble.ts` -- context packet assembly pattern (HIGH confidence, primary source)
- Existing BranchOS source: `src/commands/index.ts`, `commands/*.md` -- slash command architecture (HIGH confidence, primary source)
- Existing BranchOS source: `src/cli/install-commands.ts` -- command installation pattern (HIGH confidence, primary source)
- PROJECT.md key decisions: "Hand-rolled YAML frontmatter parser -- no gray-matter dependency" (HIGH confidence, project decision)
- PROJECT.md key decisions: "No interactive prompt library needed" (HIGH confidence, project decision)
- Claude Code documentation: WebSearch and WebFetch are built-in tools available via allowed-tools (HIGH confidence, platform feature)

---
*Stack research for: BranchOS v2.1 interactive research slash commands*
*Researched: 2026-03-11*
