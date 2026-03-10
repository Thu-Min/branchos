# Phase 6: PR-FAQ Ingestion - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can feed a PO-provided PR-FAQ document into BranchOS as the foundation for project planning. The command reads from a fixed location, validates structure, stores a copy with content hash for change detection, and handles re-ingestion with section-level diff reporting. Roadmap generation from the PR-FAQ is Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Command interface
- Fixed input location: `./PR-FAQ.md` at repo root (no file path argument)
- Both CLI command (`branchos ingest-prfaq`) and slash command (`/branchos:ingest-prfaq`)
- Command name: `ingest-prfaq` (verb-noun pattern)

### PR-FAQ validation
- Amazon-style PR-FAQ sections expected: Press Release (headline, subheadline, problem, solution, quote, CTA) + FAQ (customer FAQs, internal FAQs)
- Section presence only — check if headings exist, don't judge content quality
- If document doesn't look like a PR-FAQ (fewer than ~2 expected sections): interactive confirmation prompt "This doesn't look like a PR-FAQ. Continue anyway?"
- `--force` flag to skip confirmation prompt (enables CI/scripted usage)

### Change detection
- Content hash stored in `.branchos/shared/prfaq-meta.json` (separate from the document)
- Metadata tracks latest only: current hash, ingestion date, version — git history provides the timeline
- Re-ingesting unchanged PR-FAQ: "No changes detected"
- Re-ingesting modified PR-FAQ: section-level summary ("Updated: Problem Statement, FAQ section 3. Added: Internal FAQ.")
- Auto-commit on ingestion and re-ingestion (matches v1.0 pattern: init, map-codebase all auto-commit)

### Output and feedback
- `--json` flag for machine-readable output (consistent with init, status commands)
- Success output: summary with section counts and warnings ("Ingested PR-FAQ (6/8 sections found). Warnings: missing Customer Quotes, Internal FAQ.")
- Suggests next step after ingestion ("Next: run /branchos:plan-roadmap to generate your roadmap")
- Missing file: clear error with guidance ("No PR-FAQ.md found in repo root. Create a PR-FAQ document at ./PR-FAQ.md and try again.")

### Claude's Discretion
- Hash algorithm choice (SHA-256 vs simpler)
- Section detection heuristics (heading matching strategy)
- Exact confirmation prompt wording
- Commit message format
- prfaq-meta.json schema details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SHARED_DIR = 'shared'`, `BRANCHOS_DIR = '.branchos'` constants in `src/constants.ts`
- `GitOps` class with `addAndCommit()` in `src/git/index.ts`
- `success()`, `error()`, `output()` helpers in `src/output/index.ts`
- `fileExists()` pattern from `src/cli/init.ts`
- Commander command registration pattern in `src/cli/*.ts`

### Established Patterns
- Commander: `registerXxxCommand(program)` exports from `src/cli/` modules
- Output: `--json` flag → conditional JSON vs human-readable output
- State: JSON files with typed interfaces, `readFile`/`writeFile` from `fs/promises`
- Slash commands: stored as string literals in `src/cli/install-commands.ts` COMMANDS record

### Integration Points
- New `src/cli/ingest-prfaq.ts` module following existing CLI pattern
- New entry in `COMMANDS` record in `install-commands.ts` for slash command
- Stored PR-FAQ at `.branchos/shared/PR-FAQ.md`
- Metadata at `.branchos/shared/prfaq-meta.json`
- Register command in `src/cli/index.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-pr-faq-ingestion*
*Context gathered: 2026-03-09*
