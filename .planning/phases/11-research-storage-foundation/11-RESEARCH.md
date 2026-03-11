# Phase 11: Research Storage Foundation - Research

**Researched:** 2026-03-11
**Domain:** File-based structured storage with YAML frontmatter, index caching, and markdown section extraction
**Confidence:** HIGH

## Summary

This phase builds a storage layer for research artifacts, following the exact same architectural patterns already established by the feature file system (`src/roadmap/`). The existing `frontmatter.ts`, `feature-file.ts`, `types.ts`, and `slug.ts` are the blueprint. The key engineering challenge is generalizing the hand-rolled frontmatter parser so both features and research share it, while keeping type safety via generics or parameterization. The `index.json` cache pattern is new to the codebase but straightforward -- write-time rebuild from file scan, no concurrent write concerns at the expected scale (<50 files).

**Primary recommendation:** Mirror the feature file module structure exactly (`src/research/types.ts`, `research-file.ts`, `frontmatter.ts` generalized), add `extractSummary()` as a pure function, and implement `rebuildIndex()` as an atomic write-on-mutate pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Files named `R-NNN-slug.md` (mirrors feature naming convention `F-NNN-name.md`)
- Auto-incrementing numeric ID, slug derived from topic
- Status lifecycle: `draft` -> `complete` (two states only -- multi-session deferred to MRES-01)
- Minimal frontmatter fields: `id`, `topic`, `status`, `date`, `features` (linked feature IDs array)
- Generalized shared frontmatter parser -- extract current `frontmatter.ts` into a generic parse/stringify that both features and research use, with type-specific field definitions
- `## Summary` is always the first H2 section after frontmatter; everything between `## Summary` and the next H2 is extractable
- Soft guidance on summary length (3-8 bullets / 200-500 chars) -- not validated programmatically
- Body sections after Summary are freeform markdown -- only `## Summary` is required
- `extractSummary()` function built in this phase so Phase 13 can just call it
- Links stored in research frontmatter only (`features: [F-001, F-003]`)
- Feature files stay unchanged -- no `researchRefs` field added
- Lookup via index scan: read index.json, filter entries where features array includes target feature ID
- Unlinked research allowed -- `features` can be empty array
- No validation that referenced feature IDs exist -- store decoupled from feature registry
- `index.json` is a cache of frontmatter, not source of truth
- Individual research files are authoritative -- index regenerated from files
- Index rebuilt on every write (create or update) -- always consistent
- Each index entry mirrors frontmatter: `id`, `topic`, `status`, `date`, `features`, `filename`
- Internal `rebuildIndex()` function that scans all `R-*.md` files and regenerates index.json

### Claude's Discretion
- Exact generalization approach for the shared frontmatter parser (generic vs parameterized)
- Error handling for corrupt/unparseable research files
- ID auto-increment implementation (scan existing files vs. track in index)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RES-03 | Research findings persisted as structured markdown with YAML frontmatter in `.branchos/shared/research/` | Frontmatter parser generalization, research-file.ts read/write/readAll, types.ts with ResearchFrontmatter |
| RES-04 | Research artifacts linkable to features via `researchRefs` | `features` array in frontmatter, index.json lookup by feature ID, `findByFeature()` function |
| RES-05 | Research artifacts include summary section for downstream consumption | `extractSummary()` pure function parsing `## Summary` to next H2 boundary |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs/promises | built-in | File I/O (readFile, writeFile, readdir, mkdir) | Already used by feature-file.ts, zero deps |
| Node.js path | built-in | Path manipulation (join, basename) | Already used throughout codebase |
| vitest | ^3.0.0 | Testing | Already the project test framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | - | Zero new dependencies per project constraint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled YAML parser | gray-matter npm package | Would add dependency -- explicitly excluded by project constraints |
| File-scan index rebuild | Incremental index updates | Premature optimization for <50 files; full scan is simpler and always consistent |

**Installation:**
```bash
# No new packages needed -- zero new dependencies constraint
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── research/                  # NEW: research storage module
│   ├── types.ts              # ResearchStatus, ResearchFrontmatter, ResearchArtifact
│   ├── research-file.ts      # writeResearchFile, readResearchFile, readAllResearch
│   ├── research-index.ts     # rebuildIndex, readIndex, findByFeature
│   └── extract-summary.ts    # extractSummary pure function
├── roadmap/
│   ├── frontmatter.ts        # MODIFIED: generalized parse/stringify (shared)
│   ├── feature-file.ts       # UNCHANGED: uses generalized frontmatter
│   ├── types.ts              # UNCHANGED
│   └── slug.ts               # REUSED: slugify for research filenames
└── constants.ts               # MODIFIED: add RESEARCH_DIR constant
```

### Pattern 1: Generalized Frontmatter Parser
**What:** Extract the frontmatter parse/stringify into a generic form that both features and research can use with their own field definitions.
**When to use:** Any time a new file type with YAML frontmatter is added.

**Recommended approach -- parameterized parser with field config:**
```typescript
// Generalized frontmatter parser in src/roadmap/frontmatter.ts

export interface FieldConfig {
  name: string;
  parse: (raw: string) => unknown;
  stringify: (value: unknown) => string;
}

export interface FrontmatterConfig<T> {
  fields: FieldConfig[];
  fieldOrder: string[];
}

export function parseFrontmatter<T extends Record<string, unknown>>(
  content: string,
  config: FrontmatterConfig<T>,
): { data: T; body: string } {
  // Same delimiter logic as current implementation
  // Use config.fields for type-specific parsing (arrays, numbers, etc.)
}

export function stringifyFrontmatter<T extends Record<string, unknown>>(
  data: T,
  config: FrontmatterConfig<T>,
): string {
  // Use config.fieldOrder for consistent output ordering
}
```

**Key consideration:** The current `parseValue()` has feature-specific logic (e.g., `issue` as number). The generalized version needs per-field parse functions. The simplest approach: each module defines a config object with field parsers.

**Alternative approach -- keep it simpler:** Just extract the delimiter-splitting logic as a generic `splitFrontmatter(content) => { rawFields: Map<string, string>, body: string }` and let each module do its own field parsing. This is lower risk since it changes less existing code.

### Pattern 2: Array Field in YAML Frontmatter
**What:** The `features` field stores an array: `features: [F-001, F-003]`
**When to use:** Research frontmatter.

**Parsing approach:**
```typescript
// Parse: "features: [F-001, F-003]" -> ["F-001", "F-003"]
// Parse: "features: []" -> []
function parseArrayField(raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '[]') return [];
  // Strip brackets, split on comma, trim each
  return trimmed
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Stringify: ["F-001", "F-003"] -> "[F-001, F-003]"
function stringifyArrayField(arr: string[]): string {
  if (arr.length === 0) return '[]';
  return `[${arr.join(', ')}]`;
}
```

**Important:** This is a new value type not in the current parser. The current parser only handles strings, numbers, and null. Arrays must be added as part of the generalization.

### Pattern 3: Index Rebuild on Write
**What:** Every write operation (create/update) rebuilds `index.json` from all `R-*.md` files.
**When to use:** After `writeResearchFile`.

```typescript
export async function rebuildIndex(dir: string): Promise<ResearchIndexEntry[]> {
  const artifacts = await readAllResearch(dir);
  const entries: ResearchIndexEntry[] = artifacts.map(a => ({
    id: a.id,
    topic: a.topic,
    status: a.status,
    date: a.date,
    features: a.features,
    filename: a.filename,
  }));
  await writeFile(join(dir, 'index.json'), JSON.stringify(entries, null, 2));
  return entries;
}
```

### Pattern 4: Summary Extraction
**What:** Extract content between `## Summary` and the next H2 heading.
**When to use:** Phase 13 context assembly, any time summary is needed without reading full artifact.

```typescript
export function extractSummary(body: string): string | null {
  const lines = body.split('\n');
  const summaryStart = lines.findIndex(l => /^## Summary\s*$/.test(l));
  if (summaryStart === -1) return null;

  const nextH2 = lines.findIndex(
    (l, i) => i > summaryStart && /^## /.test(l)
  );

  const end = nextH2 === -1 ? lines.length : nextH2;
  return lines.slice(summaryStart + 1, end).join('\n').trim();
}
```

### Pattern 5: ID Auto-Increment
**What:** Determine next `R-NNN` ID when creating a new research artifact.
**Recommended:** Scan existing files, extract max numeric ID, increment.

```typescript
export function nextResearchId(existingIds: string[]): string {
  if (existingIds.length === 0) return 'R-001';
  const nums = existingIds.map(id => parseInt(id.replace('R-', ''), 10));
  const max = Math.max(...nums);
  return `R-${String(max + 1).padStart(3, '0')}`;
}
```

**Why scan files, not index:** The index is a cache and could be stale or missing. Scanning files is the authoritative source and costs nothing at <50 files.

### Anti-Patterns to Avoid
- **Coupling research store to feature registry:** Do NOT validate that feature IDs in `features` array actually exist. The store is decoupled by design.
- **Making index.json the source of truth:** The individual `.md` files are authoritative. Index is always regenerable.
- **Adding complex YAML parsing:** Do NOT use nested YAML, multi-line values, or anything the hand-rolled parser cannot handle. Keep frontmatter flat.
- **Validating summary content:** Summary length/format is guidance, not enforced. Do NOT add validators.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom slugify | Existing `src/roadmap/slug.ts` `slugify()` | Already tested, handles edge cases |
| File naming | Custom naming scheme | Adapt `featureFilename()` pattern | Consistent `R-NNN-slug.md` format |
| Directory creation | Manual mkdir checks | `mkdir(dir, { recursive: true })` | Already used in feature-file.ts |
| Full YAML parsing | New YAML parser or npm dep | Generalize existing hand-rolled parser | Zero new deps constraint, sufficient for flat frontmatter |

**Key insight:** This phase is primarily about adapting existing patterns, not inventing new ones. The feature file system has already solved the hard problems (frontmatter parsing, file naming, directory management, read/write/readAll). Research storage is a second consumer of the same patterns.

## Common Pitfalls

### Pitfall 1: Breaking Feature File Tests During Frontmatter Generalization
**What goes wrong:** Changing `parseFrontmatter` signature or behavior breaks all existing feature file tests.
**Why it happens:** The generalization modifies shared code that features already depend on.
**How to avoid:** Keep the existing `parseFrontmatter(content)` signature working for features (possibly as a thin wrapper around the generic version). Run `vitest run` after every change to the shared parser. Consider: generalize the core, then create `parseFeatureFrontmatter` and `parseResearchFrontmatter` wrappers.
**Warning signs:** Feature file tests (tests/roadmap/frontmatter.test.ts, tests/roadmap/feature-file.test.ts) failing.

### Pitfall 2: Array Parsing Edge Cases
**What goes wrong:** The `features` array field has edge cases: empty array `[]`, single item `[F-001]`, items with spaces, missing brackets.
**Why it happens:** Hand-rolled YAML parser is minimal and doesn't handle all YAML array syntax.
**How to avoid:** Define a strict format (`[item1, item2]` inline only) and test all edge cases. Do NOT try to support full YAML array syntax (multi-line `- item` format).
**Warning signs:** Round-trip tests failing for array fields.

### Pitfall 3: Index.json Race Conditions (Theoretical)
**What goes wrong:** Two simultaneous writes could produce inconsistent index.
**Why it happens:** Non-atomic read-modify-write cycle.
**How to avoid:** Not a practical concern for CLI tool (single user). But use atomic-ish pattern: rebuild from file scan (not incremental), so even if interrupted, a re-run repairs. Document that `rebuildIndex()` can be called standalone for repair.
**Warning signs:** None in practice -- this is defensive design.

### Pitfall 4: extractSummary Returning Empty String vs Null
**What goes wrong:** Callers can't distinguish "no summary section" from "empty summary section."
**Why it happens:** Inconsistent null handling.
**How to avoid:** Return `null` when `## Summary` heading is missing entirely. Return empty string when heading exists but content is empty. Document this contract clearly.
**Warning signs:** Phase 13 integration surprises.

### Pitfall 5: ID Padding Inconsistency
**What goes wrong:** IDs generated as `R-1` instead of `R-001`, or `R-0001` for 4-digit.
**Why it happens:** Inconsistent zero-padding logic.
**How to avoid:** Always 3-digit padding (`padStart(3, '0')`), matching feature `F-001` convention. Parse IDs by stripping prefix and parseInt.
**Warning signs:** File sorting order broken, index entries with inconsistent IDs.

## Code Examples

### Research Artifact File Format
```markdown
---
id: R-001
topic: Authentication Patterns
status: draft
date: 2026-03-11
features: [F-001, F-003]
---

## Summary

- OAuth2 with PKCE is the recommended flow for CLI tools
- Token refresh should use rotating refresh tokens
- Session storage via OS keychain (keytar) is standard

## Findings

### OAuth2 Flow Comparison
...

### Token Storage Options
...
```

### Research Types (src/research/types.ts)
```typescript
export const RESEARCH_STATUSES = ['draft', 'complete'] as const;
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export interface ResearchFrontmatter {
  id: string;
  topic: string;
  status: ResearchStatus;
  date: string;
  features: string[];
}

export interface ResearchArtifact extends ResearchFrontmatter {
  body: string;
  filename: string;
}

export interface ResearchIndexEntry {
  id: string;
  topic: string;
  status: ResearchStatus;
  date: string;
  features: string[];
  filename: string;
}
```

### Feature Lookup by Research Index
```typescript
export async function findResearchByFeature(
  dir: string,
  featureId: string,
): Promise<ResearchIndexEntry[]> {
  const index = await readIndex(dir);
  return index.filter(entry => entry.features.includes(featureId));
}

export async function readIndex(dir: string): Promise<ResearchIndexEntry[]> {
  try {
    const content = await readFile(join(dir, 'index.json'), 'utf-8');
    return JSON.parse(content) as ResearchIndexEntry[];
  } catch {
    return [];
  }
}
```

### Research Filename Generation
```typescript
import { slugify } from '../roadmap/slug.js';

export function researchFilename(id: string, topic: string): string {
  return `${id}-${slugify(topic)}.md`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Feature-specific frontmatter parser | Generalized frontmatter parser | This phase | Both features and research use shared core |
| No research storage | `.branchos/shared/research/` directory | This phase | Research artifacts persist across sessions |
| No index files in codebase | `index.json` cache pattern | This phase | Fast lookup without scanning individual files |

**Deprecated/outdated:**
- None -- this is new functionality building on established patterns.

## Open Questions

1. **Generalization depth for frontmatter parser**
   - What we know: Current parser is tightly coupled to FeatureFrontmatter type. Must support arrays for research.
   - What's unclear: Whether to go full generic (config-driven with field parsers) or minimal (shared splitting + per-module parse). Both work.
   - Recommendation: Minimal approach -- shared `splitFrontmatter()` for delimiter logic, module-specific `parseFeatureFields()` and `parseResearchFields()`. Lower risk, less code churn, keeps existing tests passing with minimal changes.

2. **Date format for `date` field**
   - What we know: Need a `date` field in research frontmatter.
   - What's unclear: ISO 8601 full (`2026-03-11T10:30:00Z`) or date-only (`2026-03-11`)?
   - Recommendation: Date-only `YYYY-MM-DD` string. Simpler, readable in frontmatter, sufficient for sorting/display. Matches how dates appear elsewhere in the project (STATE.md, CONTEXT.md).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | vitest.config.ts (exists) |
| Quick run command | `npx vitest run tests/research/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RES-03 | Write research file creates .md with valid YAML frontmatter | unit | `npx vitest run tests/research/research-file.test.ts -t "write"` | No -- Wave 0 |
| RES-03 | Read research file parses frontmatter and body | unit | `npx vitest run tests/research/research-file.test.ts -t "read"` | No -- Wave 0 |
| RES-03 | readAllResearch scans R-*.md files sorted by id | unit | `npx vitest run tests/research/research-file.test.ts -t "readAll"` | No -- Wave 0 |
| RES-04 | features array parsed from frontmatter correctly | unit | `npx vitest run tests/research/research-frontmatter.test.ts -t "features"` | No -- Wave 0 |
| RES-04 | findResearchByFeature filters index entries | unit | `npx vitest run tests/research/research-index.test.ts -t "findByFeature"` | No -- Wave 0 |
| RES-04 | index.json rebuilt on write with correct entries | unit | `npx vitest run tests/research/research-index.test.ts -t "rebuild"` | No -- Wave 0 |
| RES-05 | extractSummary extracts content between ## Summary and next H2 | unit | `npx vitest run tests/research/extract-summary.test.ts` | No -- Wave 0 |
| RES-05 | extractSummary returns null when no ## Summary heading | unit | `npx vitest run tests/research/extract-summary.test.ts -t "missing"` | No -- Wave 0 |
| N/A | Generalized frontmatter parser preserves existing feature round-trips | regression | `npx vitest run tests/roadmap/frontmatter.test.ts` | Yes -- existing |
| N/A | Feature file operations unchanged after refactor | regression | `npx vitest run tests/roadmap/feature-file.test.ts` | Yes -- existing |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/research/ tests/roadmap/frontmatter.test.ts tests/roadmap/feature-file.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/research/research-file.test.ts` -- covers RES-03 (write, read, readAll)
- [ ] `tests/research/research-frontmatter.test.ts` -- covers array parsing, round-trips
- [ ] `tests/research/research-index.test.ts` -- covers RES-04 (rebuild, findByFeature, readIndex)
- [ ] `tests/research/extract-summary.test.ts` -- covers RES-05 (extraction, edge cases)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/roadmap/frontmatter.ts`, `feature-file.ts`, `types.ts`, `slug.ts` -- direct blueprint
- Existing tests: `tests/roadmap/frontmatter.test.ts`, `tests/roadmap/feature-file.test.ts` -- test patterns
- `src/constants.ts` -- constant naming convention
- `src/context/assemble.ts` -- downstream consumer for Phase 13

### Secondary (MEDIUM confidence)
- `vitest.config.ts` and `package.json` -- test framework configuration

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new deps, all Node.js built-ins already in use
- Architecture: HIGH -- direct mirror of existing feature file patterns in the codebase
- Pitfalls: HIGH -- identified from actual code review of existing parser limitations
- Generalization approach: MEDIUM -- two viable approaches, recommendation is the lower-risk option

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- internal codebase patterns, no external dependencies)
