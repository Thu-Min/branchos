# Phase 6: PR-FAQ Ingestion - Research

**Researched:** 2026-03-09
**Domain:** CLI command implementation, file ingestion, content hashing, markdown section detection
**Confidence:** HIGH

## Summary

Phase 6 adds a single new CLI command (`branchos ingest-prfaq`) that reads `./PR-FAQ.md` from the repo root, validates its structure by detecting Amazon-style PR-FAQ sections, stores a copy at `.branchos/shared/PR-FAQ.md` with content hash metadata, and handles re-ingestion with section-level diff reporting. This is a well-bounded feature that follows established v1.0 patterns almost exactly.

The codebase already provides all infrastructure needed: Commander command registration, `GitOps.addAndCommit()`, output helpers (`success`, `error`, `warning`), `fileExists()` pattern, `promptYesNo()` for interactive confirmation, and the `--json` flag convention. No new dependencies are required -- Node.js built-in `crypto.createHash` handles SHA-256, and markdown heading detection is straightforward regex work.

**Primary recommendation:** Follow the `init.ts` pattern precisely -- export a handler function (testable) and a `registerIngestPrfaqCommand` registration function. Use `node:crypto` createHash for SHA-256. Detect sections via `## ` heading regex matching against a known section list.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Fixed input location: `./PR-FAQ.md` at repo root (no file path argument)
- Both CLI command (`branchos ingest-prfaq`) and slash command (`/branchos:ingest-prfaq`)
- Command name: `ingest-prfaq` (verb-noun pattern)
- Amazon-style PR-FAQ sections expected: Press Release (headline, subheadline, problem, solution, quote, CTA) + FAQ (customer FAQs, internal FAQs)
- Section presence only -- check if headings exist, don't judge content quality
- If document doesn't look like a PR-FAQ (fewer than ~2 expected sections): interactive confirmation prompt with `--force` flag to skip
- Content hash stored in `.branchos/shared/prfaq-meta.json` (separate from the document)
- Metadata tracks latest only: current hash, ingestion date, version -- git history provides the timeline
- Re-ingesting unchanged PR-FAQ: "No changes detected"
- Re-ingesting modified PR-FAQ: section-level summary of changes
- Auto-commit on ingestion and re-ingestion
- `--json` flag for machine-readable output
- Success output: summary with section counts and warnings
- Suggests next step after ingestion
- Missing file: clear error with guidance

### Claude's Discretion
- Hash algorithm choice (SHA-256 vs simpler)
- Section detection heuristics (heading matching strategy)
- Exact confirmation prompt wording
- Commit message format
- prfaq-meta.json schema details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRFAQ-01 | User can ingest a PO-provided PR-FAQ.md into `.branchos/shared/PR-FAQ.md` | File copy with `fs/promises`, auto-commit via `GitOps.addAndCommit()`, Commander registration pattern from `init.ts` |
| PRFAQ-02 | System validates PR-FAQ structure and warns on missing sections (lenient, not strict) | Regex heading detection against known section list, `warning()` output helper already exists |
| PRFAQ-03 | System stores content hash of PR-FAQ for change detection | `node:crypto` SHA-256, metadata JSON at `.branchos/shared/prfaq-meta.json` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^12.1.0 | CLI framework | Already in project, all commands use it |
| node:crypto | built-in | SHA-256 content hashing | Node.js built-in, no external dependency needed |
| node:fs/promises | built-in | File I/O (readFile, writeFile, access, copyFile) | Already used throughout codebase |
| simple-git | ^3.27.0 | Git operations (addAndCommit) | Already in project via GitOps class |
| chalk | ^4.1.2 | Terminal output coloring | Already in project via output helpers |

### Supporting
No new libraries needed. All requirements are met by existing dependencies and Node.js built-ins.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SHA-256 (node:crypto) | MD5 or CRC32 | SHA-256 is standard for content hashing, no performance concern for single-file hashing, and `node:crypto` is zero-cost |
| Regex heading detection | markdown-it or remark parser | Full parser is overkill for heading-level detection; regex on `## ` prefixes is reliable for this use case |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── ingest-prfaq.ts    # Command registration + handler (follows init.ts pattern)
│   └── index.ts            # Add registerIngestPrfaqCommand call
├── prfaq/
│   ├── validate.ts         # Section detection and validation logic
│   ├── hash.ts             # Content hashing and change detection
│   └── types.ts            # PrfaqMeta interface, section definitions
└── (existing modules unchanged)
```

### Pattern 1: Handler + Registration Split
**What:** Separate the handler logic (testable, accepts options object) from the Commander registration (thin wrapper).
**When to use:** Every CLI command in this project.
**Example:**
```typescript
// Source: src/cli/init.ts (existing pattern)
interface IngestPrfaqOptions {
  json: boolean;
  force: boolean;
  cwd?: string;
}

interface IngestPrfaqResult {
  success: boolean;
  action: 'ingested' | 'updated' | 'unchanged';
  sectionsFound: string[];
  sectionsMissing: string[];
  warnings: string[];
  error?: string;
  diff?: SectionDiff;
}

export async function ingestPrfaqHandler(options: IngestPrfaqOptions): Promise<IngestPrfaqResult> {
  // ... logic here
}

export function registerIngestPrfaqCommand(program: Command): void {
  program
    .command('ingest-prfaq')
    .description('Ingest PR-FAQ document for project planning')
    .option('--json', 'Output in JSON format', false)
    .option('--force', 'Skip confirmation prompts', false)
    .action(async (opts) => {
      const result = await ingestPrfaqHandler({ json: opts.json, force: opts.force });
      if (!result.success) process.exit(1);
    });
}
```

### Pattern 2: Content Hash Metadata
**What:** Store content hash and metadata in a separate JSON file alongside the stored document.
**When to use:** Change detection for any ingested document.
**Example:**
```typescript
// prfaq-meta.json schema
interface PrfaqMeta {
  contentHash: string;        // SHA-256 hex digest of PR-FAQ.md content
  ingestedAt: string;         // ISO 8601 timestamp
  version: number;            // Schema version for future migrations (start at 1)
  sectionsFound: string[];    // Which sections were detected
  sectionsMissing: string[];  // Which expected sections were not found
  sourceSize: number;         // File size in bytes for quick sanity check
}
```

### Pattern 3: Section Detection via Heading Matching
**What:** Match markdown `## ` headings against a known list of expected PR-FAQ sections using case-insensitive substring/fuzzy matching.
**When to use:** Validating PR-FAQ structure.
**Example:**
```typescript
// Known Amazon PR-FAQ sections (expected headings)
const EXPECTED_SECTIONS = [
  { id: 'headline', patterns: ['headline', 'title', 'press release'] },
  { id: 'subheadline', patterns: ['subheadline', 'subtitle', 'sub-headline'] },
  { id: 'problem', patterns: ['problem', 'customer problem'] },
  { id: 'solution', patterns: ['solution'] },
  { id: 'quote', patterns: ['quote', 'leadership quote', 'customer quote'] },
  { id: 'cta', patterns: ['call to action', 'cta', 'getting started', 'how to get started'] },
  { id: 'customer-faq', patterns: ['customer faq', 'external faq', 'customer questions'] },
  { id: 'internal-faq', patterns: ['internal faq', 'stakeholder faq', 'internal questions'] },
] as const;

function detectSections(content: string): { found: string[]; missing: string[] } {
  const headings = content
    .split('\n')
    .filter(line => line.startsWith('#'))
    .map(line => line.replace(/^#+\s*/, '').toLowerCase().trim());

  const found: string[] = [];
  const missing: string[] = [];

  for (const section of EXPECTED_SECTIONS) {
    const matched = headings.some(h =>
      section.patterns.some(p => h.includes(p))
    );
    if (matched) found.push(section.id);
    else missing.push(section.id);
  }

  return { found, missing };
}
```

### Pattern 4: Section-Level Diff for Re-ingestion
**What:** Compare old and new PR-FAQ section structures to report what changed.
**When to use:** Re-ingestion of a modified PR-FAQ.
**Example:**
```typescript
interface SectionDiff {
  added: string[];    // Sections present in new but not old
  removed: string[];  // Sections present in old but not new
  modified: string[]; // Sections present in both but content changed
}

function diffSections(oldContent: string, newContent: string): SectionDiff {
  // Split both documents into section maps (heading -> content)
  // Compare: sections added, removed, or with changed content
}
```

### Anti-Patterns to Avoid
- **Parsing markdown with regex beyond headings:** Heading-level detection is fine, but don't try to parse nested markdown structure. Just split on heading boundaries.
- **Storing full diff in metadata:** Git provides history. Metadata should be latest-state-only.
- **Making validation blocking by default:** The decision is lenient validation with warnings. Never prevent ingestion due to missing sections (only the "doesn't look like a PR-FAQ" threshold triggers a confirmation prompt).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA-256 hashing | Custom hash function | `crypto.createHash('sha256')` | Built-in, battle-tested, zero dependencies |
| Interactive prompts | Custom readline wrapper | Existing `promptYesNo()` in `src/workstream/prompt.ts` | Already handles non-TTY gracefully |
| Git commits | Manual git commands | `GitOps.addAndCommit()` | Existing abstraction used by all commands |
| Terminal output | Custom console.log | `success()`, `error()`, `warning()`, `output()` helpers | Consistent formatting, JSON mode support |

**Key insight:** This phase requires zero new infrastructure. Every building block exists in v1.0. The only new logic is section detection and content hashing, both of which are pure functions under 50 lines each.

## Common Pitfalls

### Pitfall 1: File Path Resolution
**What goes wrong:** Using `process.cwd()` directly instead of git repo root for finding `PR-FAQ.md`.
**Why it happens:** User might run the command from a subdirectory.
**How to avoid:** Always resolve paths relative to `git.getRepoRoot()`, matching the `init.ts` pattern.
**Warning signs:** Tests pass when run from repo root but fail from subdirectories.

### Pitfall 2: Hash Instability Across Platforms
**What goes wrong:** Line endings (CRLF vs LF) cause different hashes for the same logical content.
**Why it happens:** Windows git may check out files with CRLF.
**How to avoid:** Normalize line endings before hashing (replace `\r\n` with `\n`). This ensures "no changes detected" works cross-platform.
**Warning signs:** Re-ingestion reports changes when no edits were made.

### Pitfall 3: Race Between Copy and Hash
**What goes wrong:** Hashing the source file but storing the copy, which might differ if the source changes during the operation.
**Why it happens:** Reading the file twice (once to hash, once to copy).
**How to avoid:** Read the file content once into memory, hash it, then write the copy from the same buffer.
**Warning signs:** Hash doesn't match the stored file on re-read.

### Pitfall 4: Heading Detection False Positives
**What goes wrong:** Code blocks containing `## ` lines get detected as headings.
**Why it happens:** Naive line-by-line regex without code block awareness.
**How to avoid:** Track whether the current line is inside a fenced code block (``` markers). Skip headings inside code blocks. This is a simple toggle -- not full markdown parsing.
**Warning signs:** Tests with code blocks in PR-FAQ show phantom sections.

### Pitfall 5: Missing `.branchos/shared/` Directory
**What goes wrong:** Writing to `.branchos/shared/PR-FAQ.md` fails because the directory doesn't exist.
**Why it happens:** User hasn't run `branchos init` yet.
**How to avoid:** Check for `.branchos/` directory existence first. Error with clear message: "BranchOS not initialized. Run `branchos init` first."
**Warning signs:** ENOENT errors in tests without proper setup.

## Code Examples

### Content Hashing
```typescript
// Source: Node.js crypto documentation
import { createHash } from 'node:crypto';

function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}
```

### Reading and Writing Metadata
```typescript
// Follows existing pattern from src/cli/init.ts
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function readMeta(sharedDir: string): Promise<PrfaqMeta | null> {
  try {
    const raw = await readFile(join(sharedDir, 'prfaq-meta.json'), 'utf-8');
    return JSON.parse(raw) as PrfaqMeta;
  } catch {
    return null;
  }
}

async function writeMeta(sharedDir: string, meta: PrfaqMeta): Promise<void> {
  await writeFile(
    join(sharedDir, 'prfaq-meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
  );
}
```

### Slash Command Template
```typescript
// Source: existing COMMANDS pattern in src/cli/install-commands.ts
'branchos:ingest-prfaq.md': `---
description: Ingest PR-FAQ document for project planning
allowed-tools: Bash(npx branchos ingest-prfaq *)
---

# Ingest PR-FAQ

Ingest the PR-FAQ document from \`./PR-FAQ.md\` into BranchOS for project planning.

\`\`\`bash
npx branchos ingest-prfaq $ARGUMENTS
\`\`\`

This command reads \`PR-FAQ.md\` from your repository root, validates its structure,
and stores it in \`.branchos/shared/\` with change detection metadata.

Options:
- \`--force\`: Skip confirmation prompt if document doesn't look like a standard PR-FAQ
- \`--json\`: Output in machine-readable JSON format

$ARGUMENTS`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | First implementation | Phase 6 | New feature, no migration needed |

This is a new feature with no prior implementation. All patterns follow v1.0 conventions.

## Open Questions

1. **Section heading flexibility**
   - What we know: Amazon PR-FAQ has a standard structure, but teams may use variations (e.g., "Customer Problem" vs "Problem Statement" vs "The Problem")
   - What's unclear: How fuzzy should heading matching be?
   - Recommendation: Use substring matching with multiple aliases per section (as shown in the section detection pattern above). This covers common variations without requiring exact matches. The `--force` flag handles edge cases.

2. **Section content diffing granularity**
   - What we know: The decision says "section-level summary" for re-ingestion changes
   - What's unclear: Should we report content changes within a section, or just presence/absence changes?
   - Recommendation: Report three categories: sections added, sections removed, and sections with modified content. For modified sections, just list them by name without showing the actual diff (git provides the full diff).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config implicit (package.json type:module) |
| Quick run command | `npx vitest run tests/cli/ingest-prfaq.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRFAQ-01 | Copies PR-FAQ.md to .branchos/shared/PR-FAQ.md | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "copies PR-FAQ"` | No - Wave 0 |
| PRFAQ-01 | Auto-commits after ingestion | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "auto-commit"` | No - Wave 0 |
| PRFAQ-01 | Errors when PR-FAQ.md not found | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "missing file"` | No - Wave 0 |
| PRFAQ-01 | Errors when branchos not initialized | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "not initialized"` | No - Wave 0 |
| PRFAQ-02 | Detects present PR-FAQ sections | unit | `npx vitest run tests/prfaq/validate.test.ts -t "detects sections"` | No - Wave 0 |
| PRFAQ-02 | Warns on missing sections | unit | `npx vitest run tests/prfaq/validate.test.ts -t "warns missing"` | No - Wave 0 |
| PRFAQ-02 | Prompts confirmation for non-PR-FAQ documents | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "confirmation"` | No - Wave 0 |
| PRFAQ-02 | --force skips confirmation prompt | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "force flag"` | No - Wave 0 |
| PRFAQ-03 | Stores SHA-256 content hash in prfaq-meta.json | unit | `npx vitest run tests/prfaq/hash.test.ts -t "stores hash"` | No - Wave 0 |
| PRFAQ-03 | Reports "no changes" for unchanged re-ingestion | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "no changes"` | No - Wave 0 |
| PRFAQ-03 | Reports section-level diff for modified re-ingestion | unit | `npx vitest run tests/cli/ingest-prfaq.test.ts -t "reports changes"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/cli/ingest-prfaq.test.ts tests/prfaq/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/cli/ingest-prfaq.test.ts` -- covers PRFAQ-01, PRFAQ-02, PRFAQ-03 (integration-level)
- [ ] `tests/prfaq/validate.test.ts` -- covers PRFAQ-02 (section detection unit tests)
- [ ] `tests/prfaq/hash.test.ts` -- covers PRFAQ-03 (hashing unit tests)
- [ ] `tests/prfaq/` directory creation

## Sources

### Primary (HIGH confidence)
- Project source code: `src/cli/init.ts`, `src/cli/index.ts`, `src/constants.ts`, `src/git/index.ts`, `src/output/index.ts`, `src/workstream/prompt.ts`, `src/cli/install-commands.ts` -- established patterns
- Node.js `crypto` module -- built-in SHA-256 support
- Node.js `fs/promises` -- file operations
- `package.json` -- confirmed vitest ^3.0.0, commander ^12.1.0

### Secondary (MEDIUM confidence)
- Amazon PR-FAQ section structure -- based on widely documented Amazon working backwards methodology

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - follows existing patterns exactly, codebase thoroughly inspected
- Pitfalls: HIGH - based on direct codebase analysis and common Node.js file handling issues

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- no external dependencies changing)
