# Architecture Research: Interactive Research Integration (v2.1)

**Domain:** Interactive research slash commands for CLI-driven AI workflow tool
**Researched:** 2026-03-11
**Confidence:** HIGH (based on direct codebase analysis of existing v2.0 architecture)

## System Overview: How Research Fits

```
                         BranchOS Architecture (v2.0 + v2.1 additions)
 ====================================================================

 Slash Commands (Claude Code)
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
 │ /context │ │ /discuss │ │  /plan   │ │ /execute │ │ /research │ <-- NEW
 └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
      │            │            │            │              │
 ─────┴────────────┴────────────┴────────────┴──────────────┴─────
                    Context Assembly Layer
 ┌────────────────────────────────────────────────────────────────┐
 │  assembleContext() — pure function, no I/O                     │
 │  Input: AssemblyInput   Output: ContextPacket                  │
 │  v2.1: + researchContext field in AssemblyInput                │
 └──────────┬─────────────────────────────────────────────────────┘
            │
 ─────────────────────────────────────────────────────────────────
                         State Layer
 ┌──────────────────────────┐  ┌──────────────────────────────────┐
 │  Shared State             │  │  Workstream State                │
 │  .branchos/shared/        │  │  .branchos/workstreams/<id>/     │
 │  ├── codebase/            │  │  ├── meta.json                  │
 │  ├── features/            │  │  │   (+ researchRefs: ["R-001"])│
 │  ├── prfaq/               │  │  ├── state.json                 │
 │  └── research/       NEW  │  │  ├── decisions.md               │
 │      ├── index.json       │  │  └── phases/<n>/                 │
 │      ├── R-001-<slug>.md  │  │      ├── discuss.md             │
 │      └── R-002-<slug>.md  │  │      ├── plan.md                │
 └──────────────────────────┘  │      └── execute.md              │
                                └──────────────────────────────────┘
```

## Key Architectural Decision: Research Lives in Shared State

**Decision: `.branchos/shared/research/`**

Research is domain knowledge, not workstream-specific work. A research session on "authentication patterns" is valuable to every workstream, not just the one that triggered it. This matches how `codebase/`, `features/`, and `prfaq/` already work -- repo-level knowledge in shared state, workstream-scoped artifacts in workstream directories.

Workstreams hold references, not copies. A workstream's `meta.json` gains an optional `researchRefs` array linking to relevant research IDs. Context assembly reads the referenced research at packet-build time.

## Component Responsibilities

| Component | Responsibility | New / Modified |
|-----------|----------------|----------------|
| `commands/branchos:research.md` | Slash command for conversational research | **NEW** |
| `src/research/types.ts` | Research artifact types, status type, index type | **NEW** |
| `src/research/store.ts` | Read/write research files and index.json | **NEW** |
| `src/research/slug.ts` | Topic-to-filename slug conversion | **NEW** |
| `src/research/index.ts` | Barrel export | **NEW** |
| `src/context/assemble.ts` | Include research context in context packets | **MODIFIED** |
| `src/cli/context.ts` | Load research files for referenced workstreams | **MODIFIED** |
| `src/commands/index.ts` | Register `branchos:research.md` in COMMANDS record | **MODIFIED** |
| `src/constants.ts` | Add `RESEARCH_DIR = 'research'` | **MODIFIED** |
| `src/state/meta.ts` | Add optional `researchRefs?: string[]` to WorkstreamMeta | **MODIFIED** |

## Research Artifact Format

Research files use YAML frontmatter + markdown body, matching the existing pattern in feature files and codebase map files. Reuses `parseFrontmatter`/`stringifyFrontmatter` from `src/roadmap/frontmatter.ts`.

```markdown
---
id: R-001
topic: "Authentication patterns for Node.js CLI tools"
status: draft
createdAt: "2026-03-11T10:00:00Z"
updatedAt: "2026-03-11T10:30:00Z"
generator: branchos/research
tags: ["auth", "security"]
---

# Authentication Patterns for Node.js CLI Tools

## Summary

[High-level findings]

## Key Findings

[Detailed research results organized by subtopic]

## Recommendations

[Opinionated recommendations with rationale]

## Sources

[References consulted]
```

### Why This Format

- **YAML frontmatter**: Matches existing patterns. No new parsing logic needed.
- **Markdown body**: Human-readable, git-diffable, works directly as Claude Code context.
- **`id` field**: Auto-incremented `R-001`, `R-002`, matching feature ID pattern `F-001`.
- **`status` field**: Two states only -- `draft` (in progress) and `complete` (finalized). Research is informal knowledge capture, not a tracked deliverable. A richer lifecycle would add ceremony without value.
- **`tags` field**: Lightweight categorization for filtering when assembling context packets.

### Research Index File

`.branchos/shared/research/index.json` provides fast lookups without scanning every file:

```json
{
  "schemaVersion": 1,
  "nextId": 3,
  "entries": [
    { "id": "R-001", "topic": "Auth patterns", "status": "complete", "filename": "R-001-auth-patterns.md" },
    { "id": "R-002", "topic": "Database options", "status": "draft", "filename": "R-002-database-options.md" }
  ]
}
```

**Why an index file when features don't have one:** The feature registry scans `F-*.md` files (currently `readAllFeatures` in `src/roadmap/feature-file.ts`). Research benefits from an index because the `/research` slash command needs to quickly show available topics during conversational flow, and a JSON index avoids parsing frontmatter from every file on each invocation.

## Architectural Patterns

### Pattern 1: Bookend Slash Command (Conversational Research)

**What:** Unlike existing slash commands which are single-shot (run, produce artifact, commit), the research command uses a "bookend" pattern -- it frames the start of a conversation and captures the end.

**How it works within Claude Code constraints:** Slash commands are prompt templates executed by Claude Code, not interactive programs. The "conversation" happens naturally through Claude Code's multi-turn chat. The slash command provides initial context framing and instructions for how to conduct research, then the user converses normally. A subcommand invocation saves the findings.

**Implementation:**

```
/branchos:research <topic>         -- Start or resume research session
/branchos:research --save          -- Save current findings to artifact
/branchos:research --list          -- List existing research topics
/branchos:research --view R-001    -- View specific research
```

**Trade-offs:**
- Pro: No custom interaction loop -- uses Claude Code's native conversation model
- Pro: Research conversation benefits from Claude's full context and capabilities
- Con: User must explicitly save (no auto-capture)
- Con: If user forgets to save, research is lost (mitigated by being explicit in the slash command instructions)

**Example slash command structure:**

```markdown
---
description: Conduct interactive domain research
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---

# Research

## Parse arguments
- If $ARGUMENTS is "--list": read index.json, display table, STOP
- If $ARGUMENTS is "--view R-NNN": read that file, display, STOP
- If $ARGUMENTS is "--save": [save flow]
- Otherwise: $ARGUMENTS is the research topic

## Start research session
1. Read .branchos/shared/research/index.json (create if missing)
2. Check if topic matches existing entry (resume vs new)
3. If resuming: read existing file, present findings so far
4. If new: allocate next ID from index

## Conduct research
Present yourself as a research assistant. Investigate the topic using:
- Your training knowledge
- Codebase context from .branchos/shared/codebase/
- User's questions and clarifications

Structure your research around: findings, recommendations, trade-offs.

## When user says "save" or runs /branchos:research --save
1. Compile findings into research artifact format
2. Write to .branchos/shared/research/R-NNN-<slug>.md
3. Update index.json
4. Auto-commit

$ARGUMENTS
```

### Pattern 2: Shared-First with Workstream References

**What:** Research artifacts live in shared state. Workstreams hold references, not copies.

**When to use:** Always for research. Research is reusable knowledge.

```typescript
// In WorkstreamMeta (src/state/meta.ts)
export interface WorkstreamMeta {
  // ... existing fields (unchanged) ...
  researchRefs?: string[];  // e.g., ["R-001", "R-003"]
}
```

Workstreams link to research via `researchRefs`. This is set when:
1. User creates a workstream with `--research R-001` flag
2. User manually adds a reference later

This matches how `featureId` already links workstreams to features -- optional pointer into shared state.

### Pattern 3: Pure Context Assembly Extension

**What:** Extend `AssemblyInput` interface with `researchContext: string | null`. The pure `assembleContext` function stays pure -- callers resolve data, the function assembles text.

**This follows the existing pattern exactly.** Looking at `src/cli/context.ts`, the `contextHandler` reads files from disk, then passes string values to `assembleContext()`. Research follows the same path:

```typescript
// In src/context/assemble.ts

// Extended AssemblyInput
export interface AssemblyInput {
  // ... all existing fields unchanged ...
  researchContext: string | null;  // NEW: concatenated relevant research
}

// Extended STEP_SECTIONS
const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss: ['featureContext', 'researchContext', 'architecture', 'conventions', 'decisions', 'branchDiff'],
  plan: ['featureContext', 'researchContext', 'discuss', 'modules', 'conventions', 'decisions', 'branchDiff'],
  execute: ['featureContext', 'plan', 'execute', 'branchDiff', 'decisions'],  // NO research in execute
  fallback: ['featureContext', 'architecture', 'conventions', 'decisions', 'branchDiff', 'hint'],
};
```

**Research context is included in `discuss` and `plan` steps but NOT `execute`.** By execution time, research findings should already be incorporated into the plan. This keeps execute context packets focused.

**In `src/cli/context.ts` (contextHandler):**

```typescript
// After loading feature context (existing code around line 72-86)
let researchContext: string | null = null;
try {
  const meta = await readMeta(metaPath);
  if (meta.researchRefs && meta.researchRefs.length > 0) {
    const researchDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, RESEARCH_DIR);
    const parts: string[] = [];
    for (const refId of meta.researchRefs) {
      const research = await readResearchById(researchDir, refId);
      if (research) {
        parts.push(`### ${research.topic}\n\n${research.body}`);
      }
    }
    if (parts.length > 0) {
      researchContext = parts.join('\n\n---\n\n');
    }
  }
} catch {
  // Research files missing/unreadable - proceed without
}
```

## New Source Files

```
src/
├── research/                  # NEW module
│   ├── index.ts               # Barrel: export { readResearch, writeResearch, ... }
│   ├── types.ts               # ResearchEntry, ResearchIndex, ResearchStatus
│   ├── store.ts               # readResearch, writeResearch, readIndex, writeIndex, allocateId, readResearchById
│   └── slug.ts                # topicToSlug() -- same pattern as roadmap/slug.ts
├── context/
│   └── assemble.ts            # MODIFIED: +researchContext in AssemblyInput, +researchContext in STEP_SECTIONS, +case in getSection
├── cli/
│   └── context.ts             # MODIFIED: load research files when meta.researchRefs exists
├── commands/
│   └── index.ts               # MODIFIED: add branchos:research.md to COMMANDS record
├── constants.ts               # MODIFIED: add RESEARCH_DIR = 'research'
└── state/
    └── meta.ts                # MODIFIED: add optional researchRefs?: string[] to WorkstreamMeta

commands/
└── branchos:research.md       # NEW slash command file
```

### Structure Rationale

- **`src/research/`**: Follows existing module-per-domain pattern (`prfaq/`, `roadmap/`, `phase/`, `map/`). Each domain gets its own directory.
- **Reuse `frontmatter.ts`**: The existing hand-rolled YAML frontmatter parser at `src/roadmap/frontmatter.ts` handles reading/writing research files. Import it -- do not duplicate.
- **Reuse slug pattern**: The `src/roadmap/slug.ts` converts titles to filenames. Research needs the same for topic-to-filename. Either import directly or extract to a shared utility if the slug logic is identical.

## Data Flow

### Research Creation Flow

```
User: /branchos:research "authentication patterns for CLI tools"
    |
    v
Slash command reads $ARGUMENTS, identifies topic
    |
    v
Read .branchos/shared/research/index.json
    |-- Exists with matching topic? Resume: read existing file, present for continuation
    |-- New topic? Allocate next ID (R-003), create draft skeleton
    |
    v
Claude Code conducts conversational research
(user asks questions, Claude investigates, back-and-forth in normal chat)
    |
    v
User: /branchos:research --save  (or says "save the research")
    |
    v
Compile findings into research artifact format
Write to .branchos/shared/research/R-003-auth-patterns-cli.md
Update index.json (add entry, increment nextId)
    |
    v
git add .branchos/shared/research/ && git commit
```

### Research Consumption Flow (Context Packets)

```
User: /branchos:context  (or /branchos:discuss-phase)
    |
    v
contextHandler() loads workstream meta.json
    |-- meta.researchRefs = ["R-001"]? Load those research files from shared/research/
    |-- meta.researchRefs absent or empty? Skip research context
    |
    v
assembleContext() receives researchContext: string | null
    |-- step is 'discuss' or 'plan'? Include "Research" section
    |-- step is 'execute'? Skip (research already baked into plan)
    |
    v
Context packet output includes:
  ## Research
  ### Auth Patterns for CLI Tools
  [findings from R-001]
```

### Research Consumption Flow (Discuss/Plan Phases)

```
User: /branchos:discuss-phase "implement user authentication"
    |
    v
Slash command gathers context (existing behavior unchanged)
    |
    v
ENHANCED: Slash command instructions say to also check
.branchos/shared/research/ for topically relevant research
    |-- Read index.json, scan topics for relevance
    |-- Include relevant findings as additional context in discuss.md
    |
    v
Generated discuss.md includes:
  ## Related Research
  See R-001 (Auth Patterns) for domain research on this topic.
  Key findings: [summary from research artifact]
```

## Integration Points (Detailed)

### New Components -> Existing Code

| New Component | Depends On (Existing) | Integration Method |
|---------------|----------------------|-------------------|
| `research/store.ts` | `roadmap/frontmatter.ts` | Import `parseFrontmatter`/`stringifyFrontmatter` |
| `research/slug.ts` | `roadmap/slug.ts` | Import or copy slug algorithm |
| `research/store.ts` | `constants.ts` | Import `BRANCHOS_DIR`, `SHARED_DIR`, new `RESEARCH_DIR` |
| `branchos:research.md` | `commands/index.ts` | Added to `COMMANDS` record |

### Existing Code -> New Components (Modifications)

| Existing File | What Changes | Backward Compatible? |
|---------------|-------------|---------------------|
| `src/constants.ts` | Add `export const RESEARCH_DIR = 'research';` | Yes -- additive |
| `src/state/meta.ts` | Add `researchRefs?: string[]` to `WorkstreamMeta` interface | Yes -- optional field, undefined in existing files |
| `src/context/assemble.ts` | Add `researchContext: string \| null` to `AssemblyInput`, add `'researchContext'` to discuss/plan in `STEP_SECTIONS`, add case in `getSection()` | Yes -- callers pass null, existing packets unchanged |
| `src/cli/context.ts` | After feature context loading, add research context loading block | Yes -- only activates when researchRefs present |
| `src/commands/index.ts` | Add import + entry for `branchos:research.md` | Yes -- additive |

### What Does NOT Change

| Component | Why Unchanged |
|-----------|--------------|
| `src/state/schema.ts` | `researchRefs` is optional on WorkstreamMeta -- no migration needed |
| `src/state/state.ts` | WorkstreamState (phases, tasks) is unaffected by research |
| `src/phase/index.ts` | Phase lifecycle (discuss/plan/execute) unchanged |
| `src/roadmap/*` | Feature registry, roadmap parsing unchanged |
| `src/prfaq/*` | PR-FAQ ingestion unchanged |
| `src/github/*` | GitHub issues sync unchanged |
| `src/map/*` | Codebase map unchanged |
| `src/git/*` | Git operations unchanged |
| All existing slash commands | Research is additive, existing commands work as before |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Research in Workstream State

**What people do:** Store research artifacts under `.branchos/workstreams/<id>/research/` because "this workstream triggered it."
**Why it is wrong:** Research is domain knowledge, not task state. Another developer on a different workstream needs the same auth research. Duplicating it defeats the shared knowledge model that the entire architecture is built on.
**Do this instead:** Always write to `.branchos/shared/research/`. Link from workstream via `researchRefs` in `meta.json`.

### Anti-Pattern 2: Building a Custom REPL

**What people do:** Implement an interactive loop within the slash command, managing conversation state, turn tracking, and response formatting.
**Why it is wrong:** Claude Code already IS the conversation runtime. A slash command is a prompt template, not a program. Building conversation management duplicates what Claude Code provides natively and creates fragile code.
**Do this instead:** Use the "bookend" pattern. The slash command frames the start (loads context, identifies topic). The user converses normally. A second invocation (`--save`) persists findings.

### Anti-Pattern 3: Dumping All Research Into Context

**What people do:** Load every research file into the context packet because "more context is better."
**Why it is wrong:** Context window is finite. Irrelevant research dilutes signal. A workstream about database optimization does not need auth research.
**Do this instead:** Only include research explicitly referenced by the workstream (`researchRefs` in meta). If no refs, include nothing. Let the user be intentional about which research is relevant.

### Anti-Pattern 4: Complex Research Status Lifecycle

**What people do:** Create `draft -> reviewing -> approved -> published -> archived -> deprecated` status lifecycle.
**Why it is wrong:** Research is informal knowledge capture, not a governed deliverable. Over-engineering the lifecycle adds ceremony without value and creates state management burden.
**Do this instead:** Two statuses: `draft` and `complete`. That is it.

### Anti-Pattern 5: Auto-Saving Research from Conversation

**What people do:** Try to intercept or parse the Claude Code conversation to auto-extract research findings.
**Why it is wrong:** Claude Code conversations are not programmatically accessible from slash commands. There is no API to read conversation history. Even if there were, auto-extraction would be unreliable.
**Do this instead:** Explicit save. The slash command instructs Claude to compile findings when asked. The user triggers this intentionally.

## Schema Migration: Not Required

The `WorkstreamMeta` interface gains `researchRefs?: string[]`. Because this field is optional (TypeScript `?`), existing `meta.json` files without it work perfectly -- `meta.researchRefs` evaluates to `undefined`, and context assembly skips research loading (the `if (meta.researchRefs && meta.researchRefs.length > 0)` guard handles this).

Similarly, `AssemblyInput` gains `researchContext: string | null`. Callers that do not resolve research pass `null`, and `assembleContext` skips it via the existing `if (key === 'researchContext' && !input.researchContext) continue;` pattern (same as `featureContext`).

**No schema version bump is needed.** No migration function is needed. This is a key advantage of using optional fields -- zero migration cost.

## Suggested Build Order

Based on dependency analysis, respecting what must exist before what can be built:

### Step 1: Research Types and Store (no dependencies on existing code changes)

New files only. Foundation that everything else builds on.

- `src/research/types.ts` -- `ResearchEntry`, `ResearchIndex`, `ResearchStatus` types
- `src/research/store.ts` -- `readResearch()`, `writeResearch()`, `readIndex()`, `writeIndex()`, `allocateId()`, `readResearchById()`
- `src/research/slug.ts` -- `topicToSlug()` function
- `src/research/index.ts` -- barrel export
- `src/constants.ts` -- add `RESEARCH_DIR` constant
- Unit tests for all of the above

### Step 2: Slash Command (depends on Step 1 for types/store)

- `commands/branchos:research.md` -- the full slash command prompt with argument parsing, research flow, and save flow
- `src/commands/index.ts` -- add to `COMMANDS` record
- Manual testing of the slash command in Claude Code

### Step 3: Context Assembly Integration (depends on Step 1 for store)

- `src/context/assemble.ts` -- add `researchContext` to `AssemblyInput`, add to `STEP_SECTIONS`, add `getSection` case
- `src/cli/context.ts` -- load research files when workstream has `researchRefs`
- `src/state/meta.ts` -- add optional `researchRefs` to `WorkstreamMeta`
- Update existing context assembly tests (add `researchContext: null` to all existing test inputs)

### Step 4: Cross-Command Integration (depends on Steps 2 and 3)

- Update `commands/branchos:discuss-phase.md` to mention checking shared research for relevant context
- Update `commands/branchos:plan-phase.md` similarly
- Update `commands/branchos:create-workstream.md` to support `--research R-001` flag
- Integration tests verifying research flows through to context packets

## Sources

- Direct analysis of `src/context/assemble.ts` -- AssemblyInput interface, STEP_SECTIONS map, getSection switch (HIGH confidence)
- Direct analysis of `src/cli/context.ts` -- contextHandler data loading pattern, featureContext loading as reference pattern (HIGH confidence)
- Direct analysis of `src/state/meta.ts` -- WorkstreamMeta interface, optional field pattern (HIGH confidence)
- Direct analysis of `src/roadmap/frontmatter.ts` -- parseFrontmatter/stringifyFrontmatter reuse (HIGH confidence)
- Direct analysis of `src/roadmap/feature-file.ts` -- feature file read/write pattern as reference (HIGH confidence)
- Direct analysis of `src/state/schema.ts` -- migration system, schema version handling (HIGH confidence)
- Direct analysis of `src/constants.ts` -- constant naming pattern (HIGH confidence)
- Direct analysis of `commands/branchos:discuss-phase.md` -- slash command structure pattern (HIGH confidence)
- Project context from `.planning/PROJECT.md` -- v2.1 milestone goals (HIGH confidence)

---
*Architecture research for: BranchOS v2.1 Interactive Research Integration*
*Researched: 2026-03-11*
