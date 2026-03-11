# Phase 11: Research Storage Foundation - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Persist structured research artifacts in `.branchos/shared/research/` with YAML frontmatter, summary extraction, feature linking, and an index for fast lookup. This phase builds the storage layer only — the interactive research command (Phase 12) and context assembly integration (Phase 13) are separate.

</domain>

<decisions>
## Implementation Decisions

### Artifact structure
- Files named `R-NNN-slug.md` (mirrors feature naming convention `F-NNN-name.md`)
- Auto-incrementing numeric ID, slug derived from topic
- Status lifecycle: `draft` → `complete` (two states only — multi-session deferred to MRES-01)
- Minimal frontmatter fields: `id`, `topic`, `status`, `date`, `features` (linked feature IDs array)
- Generalized shared frontmatter parser — extract current `frontmatter.ts` into a generic parse/stringify that both features and research use, with type-specific field definitions

### Summary extraction
- `## Summary` is always the first H2 section after frontmatter
- Everything between `## Summary` and the next H2 heading is the extractable summary
- Soft guidance on length: 3-8 bullet points / 200-500 chars (enforced by convention in slash command, not validated programmatically)
- Body sections after Summary are freeform markdown — no rigid template, only `## Summary` is required
- `extractSummary()` function built in this phase so Phase 13 can just call it

### Feature linking
- Links stored in research frontmatter only (`features: [F-001, F-003]`)
- Feature files stay unchanged — no `researchRefs` field added
- Lookup via index scan: read index.json, filter entries where features array includes target feature ID
- Unlinked research allowed — `features` can be empty array (supports exploratory research before roadmap)
- No validation that referenced feature IDs exist — store accepts any strings, keeps store decoupled from feature registry

### Index design
- `index.json` is a cache of frontmatter, not source of truth
- Individual research files are authoritative — index regenerated from files
- Index rebuilt on every write (create or update) — always consistent, negligible perf with <50 files
- Each index entry mirrors frontmatter: `id`, `topic`, `status`, `date`, `features`, `filename`
- Internal `rebuildIndex()` function that scans all `R-*.md` files and regenerates index.json — used on write, available for repair

### Claude's Discretion
- Exact generalization approach for the shared frontmatter parser (generic vs parameterized)
- Error handling for corrupt/unparseable research files
- ID auto-increment implementation (scan existing files vs. track in index)

</decisions>

<specifics>
## Specific Ideas

- Feature file system (`frontmatter.ts`, `feature-file.ts`, `types.ts`) is the blueprint — follow same patterns for consistency
- `R-NNN` prefix mirrors `F-NNN` for feature files — familiar convention across the codebase
- Constants for new directory name should go in `constants.ts`

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/roadmap/frontmatter.ts`: Hand-rolled YAML parse/stringify — to be generalized for both features and research
- `src/roadmap/feature-file.ts`: read/write/readAll pattern — blueprint for research file operations
- `src/roadmap/types.ts`: Typed frontmatter interfaces with status lifecycle — pattern for research types
- `src/constants.ts`: Directory name constants — add `RESEARCH_DIR` here

### Established Patterns
- YAML frontmatter with `---` delimiters, hand-rolled parser (no gray-matter dependency)
- File-based storage with directory + glob read pattern (`F-*.md` → `R-*.md`)
- Status as string union type with `as const` assertion
- `execFile` over `exec` for shell commands (security)
- Pure functions for testable logic (e.g., `assembleContext`)

### Integration Points
- `src/context/assemble.ts`: Will consume research summaries in Phase 13 — `extractSummary()` built now to be ready
- `.branchos/shared/research/`: New directory under existing shared state layer
- Feature files in `.branchos/shared/features/`: Linked via feature IDs in research frontmatter

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-research-storage-foundation*
*Context gathered: 2026-03-11*
