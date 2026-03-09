# Project Research Summary

**Project:** BranchOS v2 — Project-Level Planning Layer
**Domain:** CLI developer workflow tool for AI-assisted development
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

BranchOS v2 adds a project-level planning layer on top of the shipping v1 workstream engine. The core flow is: Product Owner writes a PR-FAQ document, BranchOS ingests it, AI generates a structured roadmap with milestones and feature files, features optionally sync to GitHub Issues, and developers create feature-aware workstreams that inject acceptance criteria into context packets. This is a well-scoped extension -- the existing two-layer state model (shared + workstream) accommodates all new features by adding files to shared state and optional fields to workstream metadata.

The recommended approach is minimal: one new runtime dependency (gray-matter for YAML frontmatter parsing), GitHub integration via `gh` CLI shell-out (not Octokit), and the same patterns proven in v1 -- JSON for machine state, markdown for human content, slash commands as the AI-driven UX layer. The architecture separates feature state (JSON) from feature content (markdown), which is the single most important structural decision because it avoids the fragile pattern of parsing markdown for programmatic queries.

The primary risks are: (1) roadmap refresh destroying manual edits -- mitigate by generating proposed changes for review rather than blind overwrite, (2) GitHub Issues sync creating duplicates -- mitigate by storing issue numbers locally and using tool-controlled labels for deduplication, and (3) slash-command migration stranding users -- mitigate by keeping CLI commands working with deprecation warnings rather than removing them. All three risks have clear prevention strategies that must be built into the initial design, not bolted on later.

## Key Findings

### Recommended Stack

The existing stack (Node.js 20+, TypeScript 5.5, Commander, simple-git, chalk, tsup, vitest) is unchanged. v2 adds exactly one runtime dependency.

**Core additions:**
- **gray-matter** (^4.0.3): YAML frontmatter parsing for PR-FAQ, roadmap, and feature files -- battle-tested (Astro, VitePress, Gatsby), CJS-compatible with tsup build
- **`gh` CLI** (external tool, not npm dep): GitHub Issues CRUD via subprocess -- zero new npm deps, auth handled by `gh auth`, JSON output for structured parsing
- **Node.js `crypto`** (built-in): SHA-256 content hashing for PR-FAQ change detection

**Deliberately excluded:** Octokit (15+ transitive deps, duplicates `gh`), remark/unified (30+ deps for AST parsing not needed), Zod (inconsistent with v1 patterns), file watchers, interactive prompt libraries, template engines.

### Expected Features

**Must have (v2.0 launch):**
- PR-FAQ ingestion -- read PO-authored markdown, store with content hash
- Roadmap generation -- AI reads PR-FAQ, outputs milestones + feature files
- Feature registry -- one JSON + one markdown file per feature, status lifecycle
- Feature-aware workstream creation -- `--feature <id>` pre-loads context
- Enhanced context assembly -- acceptance criteria in context packets
- Slash command migration -- all v1 CLI commands available as `/branchos:*`

**Should have (v2.x after validation):**
- GitHub Issues sync -- push features to Issues via `gh` CLI
- Roadmap refresh -- detect PR-FAQ changes, propose roadmap updates

**Defer (v3+):**
- Bidirectional issue sync (state reconciliation complexity)
- Cross-milestone dependency visualization
- Multi-repo roadmaps
- Web dashboard

### Architecture Approach

The architecture extends v1's two-layer state model. Shared state gains PR-FAQ.md, ROADMAP.md, and a `features/` directory with dual-file storage (JSON for state, markdown for content). Workstream meta gains optional `featureId` and `issueNumber` fields via schema v2-to-v3 migration. New slash commands follow the established pattern where Claude Code executes step-by-step instructions, reading/writing `.branchos/` files directly. The CLI remains the engine; slash commands are the UX layer.

**Major components:**
1. **Project Layer** (`src/project/`) -- PR-FAQ ingestion, hash-based change detection, roadmap read helpers
2. **Feature Registry** (`src/feature/`) -- CRUD operations, status lifecycle (unassigned/assigned/in-progress/complete), type definitions
3. **GitHub Issues Module** (`src/github/`) -- thin `gh` CLI wrapper, issue create/update/list, graceful degradation when `gh` unavailable
4. **Enhanced Context Assembly** -- extends existing `AssemblyInput` with feature spec, acceptance criteria, milestone context; only loads the linked feature (not all features)

### Critical Pitfalls

1. **GitHub Issues duplication on re-run** -- Store issue number in feature JSON after creation; use `branchos:<feature-id>` labels for deduplication; never match by title
2. **Roadmap refresh destroys manual edits** -- Generate to proposed file or show diff for approval; separate machine-managed structure from human prose; design refresh strategy alongside initial generation
3. **PR-FAQ parsing brittleness** -- Do not parse PR-FAQ body with regex; pass entire content to AI for roadmap generation; use frontmatter only for metadata; validate gracefully with warnings
4. **Feature registry state drift** -- Feature files are the single source of truth for BranchOS; GitHub Issues are a projection, not the authority; do not build bidirectional sync
5. **Slash command migration breaks existing users** -- Keep CLI commands working with deprecation warnings; slash commands shell out to CLI (not replace it); support both `commands/` and `skills/` directories

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and PR-FAQ Ingestion
**Rationale:** Everything depends on feature types and the schema migration. PR-FAQ ingestion is the entry point of the entire workflow and has no upstream dependencies.
**Delivers:** Feature type definitions, schema v2-to-v3 migration, constants, PR-FAQ read/hash module, `/branchos:discuss-project` slash command
**Addresses:** PR-FAQ ingestion (table stakes), schema migration infrastructure
**Avoids:** Schema migration nightmare (Pitfall 6) by establishing patterns all subsequent phases reuse; PR-FAQ parsing brittleness (Pitfall 2) by using frontmatter for metadata and passing body to AI unstructured

### Phase 2: Roadmap Generation and Feature Registry
**Rationale:** Roadmap generation consumes PR-FAQ (Phase 1 output) and produces feature files. Feature registry CRUD must exist for features to be created. These are tightly coupled -- the roadmap command creates feature files.
**Delivers:** Feature registry module (CRUD, lifecycle), roadmap helpers, `/branchos:plan-roadmap` slash command, `branchos features` CLI command
**Addresses:** Roadmap generation (table stakes), feature registry (table stakes), feature status tracking
**Avoids:** Feature registry staleness (Pitfall 5) by making feature files the single source of truth from day one; roadmap refresh edit destruction (Pitfall 3) by designing the refresh strategy now even if implementation is deferred

### Phase 3: Feature-Aware Workstreams and Context Enhancement
**Rationale:** Depends on feature registry (Phase 2). This phase connects the planning layer to the execution layer -- the core value integration.
**Delivers:** `--feature <id>` flag on workstream creation, enhanced `AssemblyInput` with feature context, acceptance criteria in execute-step context packets
**Addresses:** Feature-aware workstream creation (table stakes), enhanced context assembly (table stakes)
**Avoids:** Context assembly bloat (load only linked feature, not all features); feature-workstream linking gaps (store featureId in meta.json AND verify it flows through to context output)

### Phase 4: GitHub Issues Sync
**Rationale:** Depends on feature registry (Phase 2). Deferred from v2.0 launch because teams need to validate the feature registry format before pushing to GitHub. Can ship as v2.1.
**Delivers:** GitHub issues module, `/branchos:sync-issues` slash command, dry-run mode, idempotent create/update
**Addresses:** GitHub Issues creation (should-have)
**Avoids:** Issue duplication (Pitfall 1) by using stored issue numbers and tool-controlled labels; security exposure by defaulting to dry-run for public repos

### Phase 5: Roadmap Refresh
**Rationale:** The hardest feature. Depends on all prior phases. Deferred to v2.x because it requires solving the "preserve manual edits" problem, which benefits from observing how teams actually use feature files.
**Delivers:** `/branchos:refresh-roadmap` slash command, PR-FAQ diff detection, proposed-roadmap review workflow
**Addresses:** Roadmap refresh (should-have)
**Avoids:** Edit destruction (Pitfall 3) by generating proposed changes, not overwriting

### Phase 6: Slash Command Migration and Polish
**Rationale:** Independent of planning features but should happen after new commands are stable so the migration establishes the final command set. Cross-cutting constraint: new v2 commands should have both CLI and slash command interfaces from the start.
**Delivers:** All v1 CLI commands as `/branchos:*` slash commands, deprecation warnings on old CLI paths, `/branchos:help` command, support for both `commands/` and `skills/` directories
**Addresses:** Slash-command-only architecture (differentiator)
**Avoids:** Migration breakage (Pitfall 4) by keeping CLI working with deprecation notices

### Phase Ordering Rationale

- **Dependency chain drives order:** PR-FAQ -> Roadmap/Features -> Workstream Integration -> GitHub Sync -> Refresh. Each phase produces artifacts the next phase consumes.
- **Value delivery is incremental:** After Phase 3, teams can go from PR-FAQ to executing feature-aware workstreams. Phases 4-5 are enhancements, not prerequisites.
- **Hardest features are last:** Roadmap refresh (Phase 5) and GitHub sync (Phase 4) have the most integration complexity and benefit from real usage data.
- **Slash command migration is orthogonal:** It can progress in parallel but should finalize after the command set is stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Roadmap Generation):** The AI generation quality is the product's core value. Needs research into prompt structure, output format, and how to constrain Claude to produce consistent feature file schemas.
- **Phase 5 (Roadmap Refresh):** Merge semantics for AI-generated vs human-edited content is an unsolved UX problem. Needs research into diff strategies and the proposed-file review pattern.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation/PR-FAQ):** Well-documented patterns -- frontmatter parsing with gray-matter, SHA-256 hashing, schema migration chain extension. No unknowns.
- **Phase 3 (Feature-Aware Workstreams):** Direct extension of existing workstream creation and context assembly. The codebase already demonstrates the pattern.
- **Phase 4 (GitHub Issues Sync):** `gh` CLI is well-documented, JSON output is stable, deduplication strategy is clear from research.
- **Phase 6 (Slash Command Migration):** Existing `install-commands.ts` pattern extends naturally. The only nuance is `commands/` vs `skills/` directory support.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack is proven; gray-matter is battle-tested; `gh` CLI is well-documented. Only one new dependency. |
| Features | MEDIUM-HIGH | Feature set is clear from vision doc and competitor analysis. Roadmap generation quality (AI output) is the main uncertainty. |
| Architecture | HIGH | Direct extension of v1 patterns confirmed by codebase analysis. Dual-file feature storage and subprocess shell-out are established patterns. |
| Pitfalls | HIGH | Pitfalls identified from GitHub API documentation, codebase analysis, and v1 experience. Prevention strategies are concrete. |

**Overall confidence:** HIGH

### Gaps to Address

- **AI roadmap generation quality:** No research on prompt engineering for consistent feature file output. Phase 2 planning should include prompt prototyping and output validation.
- **Claude Code skills/commands directory migration:** The v2.1.3 merge is documented but not tested with BranchOS's install pattern. Phase 6 should verify both paths early.
- **Slash command content as string literals:** PITFALLS.md flags the current pattern (500+ line template literals in `install-commands.ts`) as technical debt. Need to decide whether to move to separate `.md` files loaded at install time before adding 4-5 new commands.
- **`AssemblyInput` interface growth:** Currently 14 fields, adding 4 more. PITFALLS.md suggests grouping into a `FeatureContext` sub-object. Decide during Phase 3 planning.

## Sources

### Primary (HIGH confidence)
- Existing BranchOS codebase: `src/context/assemble.ts`, `src/state/schema.ts`, `src/state/meta.ts`, `src/cli/install-commands.ts`, `src/workstream/create.ts`
- `.planning/v2-VISION.md` -- product direction and design decisions
- [GitHub CLI documentation](https://cli.github.com/manual/) -- `gh issue create`, `gh issue list`, `--json` output
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html) -- createHash API
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) -- API, adoption, compatibility

### Secondary (MEDIUM confidence)
- [CCPM](https://github.com/automazeio/ccpm) -- competitor analysis, PRD-to-epic pipeline
- [APM](https://github.com/sdi2200262/agentic-project-management) -- competitor analysis, multi-agent patterns
- [Amazon PR-FAQ methodology](https://workingbackwards.com/resources/working-backwards-pr-faq/) -- document structure
- [npm trends](https://npmtrends.com/front-matter-vs-gray-matter) -- frontmatter library comparison
- [Claude Code skills merge](https://medium.com/@joe.njenga/claude-code-merges-slash-commands-into-skills-dont-miss-your-update-8296f3989697) -- commands/skills directory compatibility

### Tertiary (LOW confidence)
- None -- all findings corroborated by multiple sources or direct codebase analysis

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
