# Project Research Summary

**Project:** BranchOS
**Domain:** CLI developer workflow tool -- git-based team coordination for AI-assisted coding
**Researched:** 2026-03-07
**Confidence:** MEDIUM

## Executive Summary

BranchOS is a CLI-first developer workflow tool that enables teams to coordinate AI-assisted coding through git-committed, branch-scoped state. It fills a clear gap: existing AI coding tools (Aider, Cursor, Continue) are single-developer and session-scoped, while existing workflow tools (GSD) break under concurrent team use. The opportunity is structured, persistent, team-aware context management that uses git itself as the coordination layer -- no server, no dashboard, no real-time sync.

The recommended approach is a lean TypeScript CLI built on Commander.js, with file-based JSON/Markdown state committed to a `.branchos/` directory. Context is assembled as structured markdown packets and delivered to Claude Code via slash commands (with a fallback stdout mode). The architecture follows a clean layered pattern: types and utilities at the base, git and state management in the middle, business logic (context assembly, conflict detection) above that, and thin CLI commands on top. This layering enables testing pure logic without git dependencies and allows the Claude Code integration surface to be swapped without rewriting core functionality.

The primary risks are merge conflicts in machine-generated state files (the Terraform state problem), orphaned workstream state when branches are renamed or deleted, and context packet size explosion degrading AI quality. All three are preventable with upfront design decisions: merge-friendly file formats with stable keys, stable workstream IDs decoupled from branch names, and token budgeting for context layers. The slash command integration with Claude Code is an additional strategic risk since that API surface is not formally versioned -- an adapter pattern is essential.

## Key Findings

### Recommended Stack

The stack is deliberately minimal: four production dependencies (Commander.js, simple-git, Zod, chalk) plus standard Node.js built-ins for file I/O. TypeScript in strict mode with ESM throughout. tsup for bundling, Vitest for testing. All choices prioritize reliability and small dependency footprint over framework features.

**Core technologies:**
- **TypeScript ^5.5 + Node.js >=20:** Language and runtime. Strict mode, ESM, `NodeNext` module resolution.
- **Commander.js ^13:** CLI framework. Lightweight subcommand support with strong TypeScript types. Preferred over oclif (too heavy) and yargs (weaker TS).
- **simple-git ^3.27:** Git operations wrapper. Promise-based, well-typed. Architecture research recommends raw `child_process.execFile` instead for fewer dependencies -- this is a decision to resolve in Phase 1.
- **Zod ^3.23:** Schema validation for state files. Single source of truth for types and runtime validation. Critical for catching state corruption.
- **tsup ^8:** Bundles TypeScript to single ESM file with shebang. Much simpler than raw esbuild config.
- **chalk ^5.3:** Terminal colors. Standard, lightweight.

**Stack conflict to resolve:** STACK.md recommends simple-git; ARCHITECTURE.md recommends raw `child_process.execFile` wrappers and lists simple-git as an anti-pattern. Recommendation: start with simple-git for faster initial development, plan to evaluate whether the abstraction justifies the dependency after Phase 1. The git operation surface area (branch, diff, log, status) is small enough that either approach works.

### Expected Features

**Must have (table stakes):**
- Workstream isolation (two-layer shared + workstream model)
- Branch-aware context auto-detection
- Codebase mapping/indexing (shared, persistent)
- Structured workflow phases (discuss/plan/execute)
- Progress tracking via machine-readable state
- Workstream lifecycle (create, work, complete, archive)
- Git-committed state for async team coordination
- Context assembly for Claude Code integration
- CLI installability via npm

**Should have (differentiators):**
- Cross-workstream conflict detection (file-level) -- biggest differentiator, no competitor does this
- Shared repo knowledge layer (persisted across sessions, unlike Cursor/Aider)
- Phase-specific context injection (different context for different workflow stages)
- Git-aware plan reconciliation (diff commits against plan)
- Staleness detection for codebase map

**Defer to v2+:**
- Workstream templates (low complexity but not core)
- Module-level conflict detection (high complexity, uncertain value)
- All anti-features: web dashboard, real-time collaboration, issue tracker integration, PR automation, editor plugins, multi-repo orchestration

### Architecture Approach

The architecture is a layered CLI with three runtime contexts (direct CLI, slash command invocation, git hooks) converging on shared internal modules. State lives in `.branchos/` with a two-tier structure: `shared/` for repo-wide context and `workstreams/<id>/` for branch-scoped state. The critical design pattern is context assembly as a pure function -- given shared state, workstream state, and git info, it produces a markdown string with no side effects, making it independently testable.

**Major components:**
1. **Git Layer** -- thin wrapper around git binary for branch detection, diffs, commit counting
2. **State Manager** -- all `.branchos/` file I/O, schema validation via Zod, directory structure enforcement
3. **Context Assembler** -- pure function that merges shared + workstream + git state into a markdown context packet
4. **Workstream Lifecycle** -- create, list, archive workstreams; resolve workstream from current branch
5. **Codebase Mapper** -- repo structure analysis, produces shared codebase map
6. **Conflict Detector** -- reads all active workstreams, flags file-level overlaps
7. **Slash Command Templates** -- thin markdown files in `.claude/commands/` that shell out to the CLI

### Critical Pitfalls

1. **Merge conflicts in state files** -- Design JSON state with stable object keys (not arrays), one file per concern, and append-only patterns. Shared codebase map should use a regenerate-from-scratch model where "take theirs" resolves conflicts. Must be addressed in Phase 1 state format design.

2. **Orphaned workstream state** -- Branch names are mutable but used as directory identifiers. Use a stable workstream ID (short hash or sequential) for storage, branch name for display only. Record initial commit SHA as anchor. Must be decided in Phase 1.

3. **Context packet explosion** -- Context grows unbounded across layers. Set hard token budgets per layer, summarize older phases instead of including raw artifacts, add a context manifest. Storage format in Phase 1 must enable this.

4. **Slash command integration fragility** -- Claude Code's slash command API is not versioned. Build an adapter layer so context packets are plain text/markdown deliverable via slash command, stdout, or clipboard. Design this abstraction in Phase 1.

5. **Schema evolution without versioning** -- Include `schemaVersion` in every state file from the first version. Implement forward-compatible reading and automatic migrations. Phase 1 requirement.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and State Model
**Rationale:** Everything depends on the state format and git integration layer. Getting these wrong requires a rewrite. Three of five critical pitfalls (merge conflicts, orphaned state, schema versioning) must be solved here.
**Delivers:** CLI scaffolding, git layer, state manager with Zod schemas, workstream CRUD, `.branchos/` directory structure, basic branch detection
**Addresses:** Workstream isolation, branch-aware context, workstream lifecycle, CLI installability, git integration
**Avoids:** Pitfalls 1 (merge-hostile state), 2 (branch-name-as-ID), 7 (no schema version), 9 (npm install pain), 10 (untestable git-dependent code)
**Key decisions:** Stable workstream ID strategy, state file structure for merge-friendliness, simple-git vs raw child_process

### Phase 2: Codebase Mapping and Shared Context
**Rationale:** Shared context layer is a prerequisite for context assembly (Phase 3). Codebase mapping is the foundation of the tool's AI value. Depends on state manager from Phase 1.
**Delivers:** Codebase mapper, shared context storage, staleness detection metadata, conventions storage
**Addresses:** Codebase mapping/indexing, shared repo knowledge layer, staleness detection foundations
**Avoids:** Pitfall 3 (stale context) by including tree hash in metadata from the start, Pitfall 6 (race conditions) by using regenerate-from-scratch model

### Phase 3: Workflow Phases and Progress Tracking
**Rationale:** Structured phases are table stakes and a prerequisite for phase-specific context injection. Depends on state manager (Phase 1) and informs context assembly design.
**Delivers:** Multi-phase workstream lifecycle (discuss/plan/execute), phase progression commands, progress tracking, phase artifacts storage
**Addresses:** Structured workflow phases, progress tracking, workstream-scoped decision log
**Avoids:** Pitfall 4 (context explosion) by establishing clear phase boundaries that enable later summarization

### Phase 4: Context Assembly and Claude Code Integration
**Rationale:** This is the highest-value feature -- the reason teams adopt BranchOS. Requires all three prior phases. Context assembly is a pure function over the data structures built in Phases 1-3.
**Delivers:** Context packet assembler, slash command templates, token budgeting, phase-specific context injection, fallback stdout mode
**Addresses:** Context assembly for AI, phase-specific context injection, async team coordination
**Avoids:** Pitfall 4 (context explosion) with token budgets, Pitfall 5 (slash command fragility) with adapter layer

### Phase 5: Team Coordination Features
**Rationale:** Conflict detection and team overview are differentiators but depend on multiple workstreams existing (Phases 1-3). Plan reconciliation requires structured plans from Phase 3 and git diffing from Phase 1.
**Delivers:** File-level conflict detection, workstream status overview, plan reconciliation, workstream archival
**Addresses:** Cross-workstream conflict detection, workstream status overview, git-aware plan reconciliation, workstream archival
**Avoids:** Pitfall 8 (lost context on archival) by promoting decisions to shared layer, Pitfall 11 (over-engineering conflict detection) by shipping simple path matching first

### Phase 6: Polish and Distribution
**Rationale:** Final hardening before public release. Branch-switch prompts, templates, and distribution refinements.
**Delivers:** Branch-switch prompt, workstream templates, npx support, `branchos doctor` command, `branchos repair` command
**Addresses:** Branch-switch prompt, workstream templates, npm distribution hardening
**Avoids:** Pitfall 9 (npm install failures) with npx fallback and cross-platform CI testing

### Phase Ordering Rationale

- Phases 1-3 follow the strict dependency chain identified in both FEATURES.md and ARCHITECTURE.md: git layer -> state -> shared context -> phases -> context assembly
- Phase 4 (context assembly) is intentionally separated from Phase 3 (phases) because it is the most complex integration point and benefits from stable inputs
- Phase 5 (team features) is deferred until after single-developer flow works end-to-end -- validate the core loop before adding coordination
- Phase 6 collects low-risk polish items that don't block core functionality

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Workstream identity model needs concrete design -- the branch-name vs stable-ID tradeoff has UX implications that need prototyping
- **Phase 2:** Codebase mapping strategy needs research into what makes a useful AI-consumable repo summary (token-efficient, actionable)
- **Phase 4:** Claude Code slash command integration surface needs verification against current Claude Code version; documentation may have evolved since training data cutoff

Phases with standard patterns (skip research-phase):
- **Phase 3:** Workflow phases are a well-understood state machine pattern
- **Phase 5:** File-level conflict detection is straightforward set intersection on file paths
- **Phase 6:** npm distribution and CLI polish are thoroughly documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core choices are solid but exact versions need npm registry verification. simple-git vs raw git decision unresolved. |
| Features | MEDIUM-HIGH | Feature landscape is well-mapped. Competitor analysis based on training data (early 2025), competitors may have evolved. |
| Architecture | HIGH | Layered CLI architecture is a proven pattern. Data flow is clear. Build order is well-reasoned. |
| Pitfalls | HIGH | Pitfalls map directly to known failure modes (Terraform state, npm distribution, git-committed state). Well-documented problem space. |

**Overall confidence:** MEDIUM -- strong on architecture and pitfalls, needs version verification for stack, and Claude Code integration surface needs runtime validation.

### Gaps to Address

- **simple-git vs raw child_process:** STACK.md and ARCHITECTURE.md disagree. Resolve during Phase 1 planning by evaluating the actual git operation surface area needed.
- **npm package versions:** All version numbers are from training data (May 2025 cutoff). Run `npm view <package> version` before project initialization.
- **Claude Code slash command API:** Integration approach is based on training data. Verify current slash command behavior, `$ARGUMENTS` interpolation, and `$(shell)` support before Phase 4.
- **Zod 4 status:** Zod 4 may be released or in RC. Check whether to target Zod 3 or 4 before Phase 1.
- **Token budget sizing:** No empirical data on how large context packets can be before Claude Code quality degrades. Needs experimentation in Phase 4.
- **Large repo performance:** Codebase mapping on repos with 10K+ files is untested. May need streaming or sampling strategies in Phase 2.

## Sources

### Primary (HIGH confidence)
- GSD architecture and implementation patterns (direct domain knowledge)
- Commander.js, npm `bin` field distribution (established, well-documented patterns)
- Git merge conflict patterns from Terraform state management domain
- CLI tool design principles and Node.js ecosystem patterns

### Secondary (MEDIUM confidence)
- Aider, Cursor, Continue feature sets (training data through early 2025)
- Claude Code slash command integration patterns (subject to API evolution)
- Package versions from training data (May 2025 cutoff)

### Tertiary (LOW confidence)
- @clack/prompts version and API stability (approximate, needs verification)
- Exact latest versions of all npm packages (need `npm view` verification)

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
