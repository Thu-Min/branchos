# Project Research Summary

**Project:** BranchOS v2.1 -- Interactive Research Slash Commands
**Domain:** Conversational research integration for CLI-first AI development workflow tool
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

BranchOS v2.1 adds interactive research capabilities as a pre-planning step in the workflow. The central insight from research is that this feature requires zero new dependencies. Claude Code itself is the research engine -- it has built-in WebSearch and WebFetch tools, handles multi-turn conversation natively, and executes slash command instructions. BranchOS's job is narrow: frame the research question with codebase context, let the developer converse with Claude, and persist the structured findings as git-committed markdown artifacts in `.branchos/shared/research/`. This builds entirely on proven v2.0 patterns: hand-rolled frontmatter parsing, file-based state tracking, shared storage for cross-workstream knowledge, and slash commands as the UX layer.

The recommended approach is a "bookend" slash command pattern. The `/branchos:research` command loads existing context and frames the research topic at the start of a conversation. The developer and Claude have a natural back-and-forth. A second invocation (`--save`) compiles and persists findings. Research artifacts use the same YAML frontmatter + markdown body format as feature files, stored in `.branchos/shared/research/` with an `index.json` for fast lookups. Workstreams link to research via optional `researchRefs` in meta.json, and context assembly includes research in discuss and plan steps but excludes it from execute (where research should already be baked into the plan).

The primary risks are: (1) context window bloat from unbounded research artifacts -- mitigate by including only summaries in context packets with a size budget, not raw findings; (2) scope creep turning a simple research capture tool into a general-purpose research platform -- mitigate with a hard "out of scope" list before coding; and (3) confusion between research and discuss-phase commands that serve adjacent purposes -- mitigate by anchoring research in shared state (project/feature-level) while discuss stays in workstream state (phase-level). All risks have clear architectural prevention strategies.

## Key Findings

### Recommended Stack

No new dependencies. The existing BranchOS stack handles everything needed for v2.1. See [STACK.md](./STACK.md) for full details.

**Core technologies (all existing):**
- **Node.js built-ins** (`fs`, `path`, `crypto`): Research file I/O and slug generation -- already used throughout v2.0
- **simple-git**: Auto-commit research artifacts -- same pattern as discuss/plan/execute commits
- **Hand-rolled frontmatter parser** (`src/roadmap/frontmatter.ts`): Parse/write research YAML frontmatter -- proven, zero-dep, consistent with feature files
- **Claude Code WebSearch/WebFetch**: Web research capability -- built-in tools declared via `allowed-tools` in slash command, no BranchOS code needed

**Deliberately excluded:** inquirer/prompts (Claude Code IS the interaction layer), axios/node-fetch (WebFetch handles it), gray-matter (hand-rolled parser is proven and sufficient), cheerio/puppeteer (WebFetch handles scraping), langchain/AI SDKs (Claude Code IS the AI), any database, any search library, any markdown renderer.

### Expected Features

See [FEATURES.md](./FEATURES.md) for full analysis including prior art comparison.

**Must have (v2.1 core):**
- `/branchos:research` slash command -- conversational research entry point with topic argument
- Persistent research artifacts in `.branchos/shared/research/` with structured frontmatter
- Research context in downstream commands -- discuss-phase and plan-phase consume research findings
- Research listing -- see existing research topics, dates, and linked features/milestones
- Multi-topic research -- separate files per topic, not a monolithic dump

**Should have (v2.1 differentiators):**
- Feature/milestone linking -- `--feature F-003` or `--milestone M2` associates research with planning artifacts
- Codebase-aware research -- loads ARCHITECTURE.md, STACK.md, CONVENTIONS.md for grounded recommendations
- Conversational flow -- developer guides research direction interactively, unlike single-shot approaches in GSD/RIPER

**Defer (v2.2+):**
- Research staleness detection (commit-based, like codebase map)
- Research diffing on update
- Bulk research import from external documents
- Parallel sub-agent research spawning

### Architecture Approach

The architecture extends v2.0's shared state layer with a new `research/` directory. Research is domain knowledge (shared), not task state (workstream-scoped). Workstreams hold references (`researchRefs` in meta.json), not copies. Context assembly gains a `researchContext` field included in discuss and plan steps only. No schema migration is needed -- all changes use optional fields. See [ARCHITECTURE.md](./ARCHITECTURE.md) for component diagram and data flows.

**Major components:**
1. **`src/research/` module** (NEW) -- types, store (read/write/index), slug conversion; follows existing module-per-domain pattern
2. **`commands/branchos:research.md`** (NEW) -- bookend slash command with argument parsing for topic, --save, --list, --view modes
3. **`src/context/assemble.ts`** (MODIFIED) -- adds `researchContext: string | null` to AssemblyInput, includes in discuss/plan STEP_SECTIONS
4. **`src/state/meta.ts`** (MODIFIED) -- adds optional `researchRefs?: string[]` to WorkstreamMeta

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full analysis with warning signs and recovery strategies.

1. **Context window bloat from accumulated research** -- Only inject summary-level content into context packets with a hard size budget (~4000 tokens). Raw findings stay in files with a "see full research in .branchos/..." pointer. Design the summary layer into storage from day one.
2. **Over-engineering into a state machine** -- Use artifact-driven tracking (file presence + frontmatter status), not a multi-step lifecycle. Two statuses only: `draft` and `complete`. No transition guards.
3. **Scope creep into a research platform** -- Define research as "structured conversation that produces planning-ready artifacts." Hard out-of-scope list: no custom web search, no citation management, no cross-project sharing, no domain-specific templates.
4. **Confusion between research and discuss-phase** -- Research is project/feature-level (shared state). Discuss is workstream/phase-level (workstream state). Research produces findings; discuss makes decisions informed by findings. Reinforce through storage location and command framing.
5. **Conversation continuity failure across sessions** -- Design for artifact-based continuity, not conversation memory. Research files must be self-contained with question-finding pairs so a new Claude session can read and continue meaningfully.
6. **Git history bloat from iterative research** -- Commit only at session boundaries (explicit save), not on every file write. Target 1-2 commits per research session maximum.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Research Types, Store, and Storage Design
**Rationale:** Foundation that everything else builds on. Must get the storage schema right (including summary separation) because retrofitting a summary layer is painful. No dependencies on existing code changes -- all new files.
**Delivers:** `src/research/types.ts`, `src/research/store.ts`, `src/research/slug.ts`, `src/research/index.ts`, `RESEARCH_DIR` constant, `index.json` schema, unit tests for all
**Addresses:** Persistent research artifacts (table stakes), multi-topic research (table stakes)
**Avoids:** Context bloat (Pitfall 1) by designing summary separation into storage from the start; over-engineered state machine (Pitfall 2) by using simple `draft`/`complete` status

### Phase 2: Research Slash Command
**Rationale:** Depends on Phase 1 for types and store. This is the user-facing entry point. Must get the bookend pattern right -- framing the start, using Claude Code's native conversation, and capturing findings on explicit save.
**Delivers:** `commands/branchos:research.md` slash command, registration in `src/commands/index.ts`, support for topic, --save, --list, --view modes
**Addresses:** Research slash command (table stakes), conversational flow (differentiator), codebase-aware research (differentiator), research listing (table stakes)
**Avoids:** Scope creep (Pitfall 3) by keeping the slash command under 150 lines with a clear "out of scope" boundary; conversation continuity failure (Pitfall 5) by instructing Claude to read existing artifacts first; git bloat (Pitfall 6) by committing only on explicit save

### Phase 3: Context Assembly Integration
**Rationale:** Depends on Phase 1 for store/read functions. This is what makes research valuable -- without it, research artifacts are isolated files that developers must manually reference. The whole point of integrated research is that findings flow into downstream commands.
**Delivers:** `researchContext` in `AssemblyInput`, research in discuss/plan STEP_SECTIONS, `researchRefs` in WorkstreamMeta, research loading in `contextHandler`
**Addresses:** Research context in downstream commands (table stakes), feature/milestone linking (differentiator)
**Avoids:** Context bloat (Pitfall 1) by loading only referenced research summaries, not all files; research-discuss confusion (Pitfall 4) by keeping research in shared state and including it as input context, not replacing discuss output

### Phase 4: Cross-Command Integration and Polish
**Rationale:** Depends on Phases 2 and 3. Updates existing slash commands to be research-aware. Validates the end-to-end flow from research through discuss to plan.
**Delivers:** Updated discuss-phase command (checks shared research for relevant context), updated plan-phase command (similarly), `--research R-001` flag on workstream creation, integration tests for full research-to-context pipeline
**Addresses:** Research linked to features (differentiator), team-visible research (differentiator), end-to-end workflow validation
**Avoids:** "Looks done but isn't" gap where research command works but discuss-phase never surfaces it; feature linkage gaps where workstreams cannot reference research

### Phase Ordering Rationale

- **Dependency chain is linear:** Types/store -> slash command -> context integration -> cross-command updates. Each phase produces artifacts the next phase consumes.
- **Value delivery is progressive:** After Phase 2, developers can conduct and persist research. After Phase 3, research flows into context packets. After Phase 4, the entire workflow is research-aware.
- **Risk is front-loaded:** The hardest design decision (storage schema with summary separation) is Phase 1. Getting this wrong forces rework in all subsequent phases. Getting it right means Phases 2-4 are straightforward extensions of proven patterns.
- **Scope is intentionally small:** Four phases, estimated 4-6 development sessions total. Zero new dependencies. This is a feature addition, not an architectural overhaul.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Slash Command):** The bookend pattern is novel for BranchOS. Needs careful prompt engineering for the slash command instructions -- how to frame research, how to instruct Claude to use codebase context, and how to handle the save flow. Worth a focused design session.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Types/Store):** Direct replication of feature registry patterns (`src/roadmap/feature-file.ts`). Types, file I/O, frontmatter parsing -- all proven.
- **Phase 3 (Context Assembly):** Extending `AssemblyInput` and `STEP_SECTIONS` follows the exact pattern used for `featureContext`. The codebase demonstrates the approach.
- **Phase 4 (Cross-Command):** Updating slash command markdown files to check for research. Straightforward additions to existing Step 3 (Gather context) in discuss/plan commands.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All capabilities exist in the current stack or in Claude Code's built-in tools. Sources are direct codebase analysis. |
| Features | MEDIUM-HIGH | Feature set is clear from prior art analysis (GSD, RIPER, Research-Plan-Implement). The conversational flow differentiator relies on Claude Code's native capabilities, which are well-documented. Minor uncertainty: optimal research artifact structure may need iteration after real usage. |
| Architecture | HIGH | Based entirely on direct codebase analysis of v2.0 source. All integration points verified against actual code. No new architectural patterns -- extends existing shared-state and context-assembly patterns. |
| Pitfalls | HIGH | Pitfalls derived from codebase analysis, slash command architecture constraints, and v2.0 experience. Prevention strategies are concrete and testable. |

**Overall confidence:** HIGH

### Gaps to Address

- **Research summary extraction strategy:** PITFALLS.md flags context bloat as critical, and the mitigation is a summary layer. The exact mechanism (separate summary section within the file vs. separate summary file) should be decided during Phase 1 planning. Recommendation: embedded `## Summary` section at the top of each research file, extracted by context assembly.
- **WebSearch/WebFetch availability:** These Claude Code tools depend on the user's plan and configuration. The slash command must degrade gracefully when unavailable. Phase 2 should include fallback instructions in the prompt ("if web search is not available, proceed with training knowledge and note the limitation").
- **Research artifact size guidelines:** No hard data on optimal research file size for context assembly. PITFALLS.md suggests 200 lines max per file. Validate during Phase 2 by testing context packets with varying research sizes.
- **Optimal slash command prompt length:** The research command is more complex than existing commands (multiple modes, codebase context loading, save flow). PITFALLS.md warns against exceeding 150 lines in the slash command markdown. Phase 2 planning should include a prompt design pass.

## Sources

### Primary (HIGH confidence)
- BranchOS v2.0 source code: `src/context/assemble.ts`, `src/cli/context.ts`, `src/state/meta.ts`, `src/roadmap/frontmatter.ts`, `src/roadmap/feature-file.ts`, `src/state/schema.ts`, `src/constants.ts`, `src/commands/index.ts`, `commands/branchos:discuss-phase.md`
- BranchOS PROJECT.md: v2.1 milestone definition, architectural constraints, key decisions
- Claude Code documentation: WebSearch, WebFetch built-in tools, slash command `allowed-tools`, `$ARGUMENTS` support

### Secondary (MEDIUM confidence)
- [GSD (Get Shit Done)](https://github.com/gsd-build/get-shit-done) -- research phase implementation with parallel sub-agents, artifact format
- [RIPER-5 for Claude Code](https://github.com/tony/claude-code-riper-5) -- research phase as read-only codebase exploration
- [Research-Plan-Implement Framework](https://github.com/brilliantconsultingdev/claude-research-plan-implement) -- parallel research agents, persistent findings
- [GSD Workflow Analysis](https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system) -- slash command orchestration patterns

### Tertiary (LOW confidence)
- None -- all findings corroborated by direct codebase analysis or multiple external sources

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
