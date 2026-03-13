# Phase 17: Issue-Linked Workstreams - Research

**Researched:** 2026-03-13
**Domain:** GitHub issue fetching, feature reverse-lookup, workstream creation flow extension
**Confidence:** HIGH

## Summary

Phase 17 adds a third workstream creation path (`--issue #N`) that bridges GitHub issues to the existing feature-linked workstream flow. The implementation is straightforward because it delegates to `createFeatureLinkedWorkstream` after resolving a featureId from the issue number. The main new work is: (1) a `fetchIssue` function using `ghExec`, (2) a reverse-lookup function that finds a feature by issue number or title similarity, (3) writing `issue.md` to the workstream directory, and (4) adding an "Issue Context" section to context packets.

All building blocks exist in the codebase: `ghExec` for CLI calls, `readAllFeatures` for feature access, `titleSimilarity` for fuzzy matching, `captureAssignee` as a pattern for gh CLI helpers, and `AssemblyInput` for context packet extension. The phase requires no new dependencies.

**Primary recommendation:** Implement as a single plan with four tasks: fetchIssue helper, reverse-lookup function, createWorkstream issue path + CLI flag, and context packet integration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two gh CLI calls per issue: `gh issue view #N --json title,body,labels,url` for structured metadata, `gh issue view #N` for raw markdown body
- Extract title, body (raw markdown), labels, url, and issue number
- Store as `issue.md` in workstream directory with YAML frontmatter (number, title, labels, url) and raw markdown body
- Two-tier matching: first try exact match on `feature.issue === issueNumber`, then fall back to title similarity with 0.8 threshold
- If no feature matches: error and abort
- When feature IS found: trigger full feature-linked flow (same as `--feature`)
- Separate "Issue Context" section in context packets, alongside feature context
- Full issue body included, no truncation
- Labels rendered inline after title: `## Issue: Fix auth timeout [bug, priority:high]`
- issue.md read from workstream directory during context assembly
- `--issue #N` is a new third path in createWorkstream that delegates to existing feature-linked flow
- `--issue` and `--feature` are mutually exclusive
- Input format: number only (`42` or `#42`), strip leading `#`
- `meta.issueNumber` populated with the issue number on creation
- Issue fetch + reverse-lookup is the preamble; once featureId is resolved, existing `createFeatureLinkedWorkstream` handles the rest

### Claude's Discretion
- issue.md frontmatter field names and exact format
- How to structure the `fetchIssue` helper function
- Test structure and mock patterns for gh CLI calls
- Exact formatting of the Issue Context section in context packets
- Whether to add a `readIssueFile` utility or just use generic file reading

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ISS-01 | `create-workstream --issue #N` fetches issue title/description from GitHub | fetchIssue helper using ghExec with `gh issue view` JSON + plain text modes; CLI flag addition to workstream command |
| ISS-02 | Issue-linked workstream auto-links to feature if issue was created by sync-issues | Two-tier reverse-lookup: exact match on `feature.issue === issueNumber`, then titleSimilarity fallback at 0.8 threshold; delegates to createFeatureLinkedWorkstream |
| ISS-03 | Issue metadata (title, labels, body) stored in workstream context | issue.md with YAML frontmatter written to workstream dir; new "Issue Context" section in assembleContext |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gh CLI | 2.40+ | GitHub issue fetching via `gh issue view` | Already used project-wide via `ghExec` wrapper |
| simple-git | existing | Branch operations for feature-linked flow | Already in project dependencies |
| vitest | existing | Test framework | Project standard |

### Supporting
No new dependencies needed. All functionality built on existing `ghExec`, `readAllFeatures`, `titleSimilarity`, and `assembleContext`.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── github/
│   ├── index.ts          # ghExec, captureAssignee, checkGhAvailable (existing)
│   ├── issues.ts          # createIssue, updateIssue (existing) + fetchIssue (new)
│   └── ...
├── workstream/
│   ├── create.ts          # createWorkstream (extend with issueNumber option)
│   └── issue-file.ts      # writeIssueFile, readIssueFile (new)
├── context/
│   └── assemble.ts        # assembleContext (extend with issueContext field)
└── cli/
    └── workstream.ts      # --issue flag (extend)
```

### Pattern 1: fetchIssue Helper
**What:** A function in `src/github/issues.ts` that makes two `ghExec` calls to fetch structured JSON and raw markdown body for a GitHub issue.
**When to use:** Called by the issue-linked workstream creation path.
**Example:**
```typescript
// Source: project pattern from captureAssignee in src/github/index.ts
export interface IssueData {
  number: number;
  title: string;
  body: string;       // raw markdown from plain `gh issue view`
  labels: string[];
  url: string;
}

export async function fetchIssue(issueNumber: number): Promise<IssueData> {
  // Call 1: structured JSON for metadata
  const jsonRaw = await ghExec([
    'issue', 'view', String(issueNumber),
    '--json', 'title,body,labels,url',
  ]);
  const parsed = JSON.parse(jsonRaw);

  // Call 2: plain text for raw markdown body
  const plainBody = await ghExec(['issue', 'view', String(issueNumber)]);

  return {
    number: issueNumber,
    title: parsed.title,
    body: plainBody,
    labels: (parsed.labels || []).map((l: { name: string }) => l.name),
    url: parsed.url,
  };
}
```

**Key detail:** The `gh issue view --json` `body` field returns the body as a string, but without rendering. The plain `gh issue view` (no `--json`) renders the issue in a terminal-friendly format. Per the CONTEXT.md decision, we use the plain output for the raw markdown body. However, note that `gh issue view` without `--json` outputs a rendered/formatted view, not raw markdown. The `--json body` field actually contains the raw markdown. The implementation should verify this behavior and may need to use `--json body` for the raw markdown instead.

### Pattern 2: Feature Reverse-Lookup
**What:** Given an issue number, find the matching feature by exact `feature.issue` match first, then title similarity fallback.
**When to use:** During issue-linked workstream creation, before delegating to feature-linked flow.
**Example:**
```typescript
// Source: project pattern from readAllFeatures + titleSimilarity
import { readAllFeatures } from '../roadmap/feature-file.js';
import { titleSimilarity } from '../roadmap/similarity.js';

export function findFeatureByIssue(
  features: Feature[],
  issueNumber: number,
  issueTitle: string,
): Feature | null {
  // Tier 1: exact issue number match
  const exactMatch = features.find(f => f.issue === issueNumber);
  if (exactMatch) return exactMatch;

  // Tier 2: title similarity at 0.8 threshold
  let bestMatch: Feature | null = null;
  let bestScore = 0;
  for (const f of features) {
    const score = titleSimilarity(f.title, issueTitle);
    if (score >= 0.8 && score > bestScore) {
      bestScore = score;
      bestMatch = f;
    }
  }
  return bestMatch;
}
```

### Pattern 3: issue.md File Format
**What:** YAML frontmatter + raw markdown body stored in the workstream directory.
**When to use:** Written during issue-linked workstream creation; read during context assembly.
**Example:**
```markdown
---
number: 42
title: Fix auth timeout on slow connections
labels: [bug, priority:high]
url: https://github.com/owner/repo/issues/42
---

When users have slow connections, the auth token request times out...
```

### Pattern 4: Context Packet Extension
**What:** Add `issueContext` field to `AssemblyInput` and render as "Issue Context" section.
**When to use:** When `issue.md` exists in the workstream directory.
**Example:**
```typescript
// In AssemblyInput interface, add:
issueContext: string | null;

// In STEP_SECTIONS, add 'issueContext' after 'featureContext' for all steps

// In getSection switch, add:
case 'issueContext':
  return buildSection('Issue Context', input.issueContext, '');
```

### Anti-Patterns to Avoid
- **Duplicating feature-linked logic:** The issue path must NOT copy-paste from `createFeatureLinkedWorkstream`. It resolves the featureId then calls the same function.
- **Blocking on gh unavailability:** Unlike `captureAssignee` which is non-blocking, `fetchIssue` MUST throw if gh is unavailable because the entire `--issue` flow depends on it.
- **Merging issue context into feature context:** CONTEXT.md explicitly says "separate section, alongside (not merged into) feature context."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub API calls | HTTP client / octokit | `ghExec` with `gh issue view` | Project pattern; handles auth via gh CLI |
| Title similarity | Custom string matching | `titleSimilarity` from `src/roadmap/similarity.ts` | Already tested, used by roadmap refresh |
| Feature file reading | Custom YAML parser | `readAllFeatures` from `src/roadmap/feature-file.ts` | Already handles frontmatter parsing |
| YAML frontmatter | Manual string construction | `stringifyFrontmatter` from `src/roadmap/frontmatter.ts` | Project utility for YAML frontmatter |
| Workstream creation | New creation flow | `createFeatureLinkedWorkstream` (delegate after resolving featureId) | Existing tested flow handles branch, meta, state, feature update, commit |

## Common Pitfalls

### Pitfall 1: `gh issue view` Plain vs JSON Body
**What goes wrong:** The plain `gh issue view` (no `--json`) outputs a terminal-rendered format with ANSI colors and formatting, not raw markdown. Using it as the "raw markdown body" will include unwanted formatting artifacts.
**Why it happens:** Confusion between `gh issue view` output modes.
**How to avoid:** Use `--json body` for the raw markdown body. The JSON `body` field contains the actual markdown source. Only use the plain mode if you specifically want the rendered display.
**Warning signs:** Body content contains ANSI escape codes or unexpected formatting.

### Pitfall 2: `--issue` and `--feature` Mutual Exclusivity
**What goes wrong:** Both flags provided, causing ambiguous behavior.
**Why it happens:** User passes both flags on the command line.
**How to avoid:** Check for mutual exclusivity at the CLI layer before calling `createWorkstream`. Throw clear error: "Cannot use --issue and --feature together."
**Warning signs:** Tests don't cover the mutual exclusivity case.

### Pitfall 3: Issue Number Parsing Edge Cases
**What goes wrong:** `#42`, `42`, `#0`, negative numbers, non-numeric strings passed as issue number.
**Why it happens:** User input is unpredictable.
**How to avoid:** Strip leading `#`, parse with `parseInt`, validate `> 0`. Error on invalid input before any gh calls.
**Warning signs:** `NaN` or `0` passed to gh CLI.

### Pitfall 4: Feature Already In-Progress
**What goes wrong:** Issue maps to a feature that's already being worked on by another workstream.
**Why it happens:** Multiple developers pick up the same issue.
**How to avoid:** `createFeatureLinkedWorkstream` already checks for `status === 'in-progress'` and throws. No extra handling needed since we delegate.
**Warning signs:** N/A - handled by existing code.

### Pitfall 5: Labels Array in JSON
**What goes wrong:** `gh issue view --json labels` returns `[{name: "bug", ...}, ...]` not `["bug", ...]`.
**Why it happens:** GH CLI returns label objects with `name`, `color`, `description` fields.
**How to avoid:** Map labels to extract `.name`: `labels.map(l => l.name)`.
**Warning signs:** YAML frontmatter contains `[object Object]` instead of label names.

### Pitfall 6: createMeta issueNumber Parameter
**What goes wrong:** `createMeta` currently has no `issueNumber` parameter - it always sets `issueNumber: null`.
**Why it happens:** Phase 16 added the field but deferred population to Phase 17.
**How to avoid:** Add an `issueNumber` parameter to `createMeta` (with default `null` for backward compatibility). Call it with the issue number in the issue-linked flow.
**Warning signs:** `meta.issueNumber` is always `null` even after `--issue` creation.

## Code Examples

### Existing ghExec Pattern (from src/github/index.ts)
```typescript
// Source: src/github/index.ts line 3-14
export async function ghExec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, (error, stdout, stderr) => {
      if (error) {
        const message = stderr?.trim() || error.message;
        reject(new Error(message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}
```

### Existing Mock Pattern for gh CLI Tests (from tests/github/index.test.ts)
```typescript
// Source: tests/github/index.test.ts
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const { execFile } = await import('child_process');
const mockedExecFile = vi.mocked(execFile);

function mockExecFileSuccess(stdout: string, stderr = '') {
  mockedExecFile.mockImplementation(
    ((_file: string, _args: any, callback: any) => {
      callback(null, stdout, stderr);
    }) as any,
  );
}
```

### Existing createWorkstream Mock Pattern (from tests/workstream/create.test.ts)
```typescript
// Source: tests/workstream/create.test.ts
vi.mock('../../src/github/index.js', () => ({
  captureAssignee: vi.fn(),
}));
const { captureAssignee } = await import('../../src/github/index.js');
const mockedCaptureAssignee = vi.mocked(captureAssignee);
```

### createMeta Current Signature (needs issueNumber param)
```typescript
// Source: src/state/meta.ts line 16
export function createMeta(
  workstreamId: string,
  branch: string,
  featureId?: string,
  assignee: string | null = null
): WorkstreamMeta
// issueNumber is hardcoded to null - needs new parameter
```

### Feature.issue Field (for reverse-lookup)
```typescript
// Source: src/roadmap/types.ts
export interface FeatureFrontmatter {
  // ...
  issue: number | null;  // Set by sync-issues, used for reverse-lookup
  // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--feature` only | `--feature` OR `--issue` | Phase 17 | Third creation path |
| `issueNumber` always null | Populated from `--issue` flag | Phase 17 | Enables Phase 18 `Closes #N` |
| No issue context in packets | "Issue Context" section | Phase 17 | Richer context for issue-linked work |

## Open Questions

1. **Plain vs JSON body from `gh issue view`**
   - What we know: `gh issue view --json body` gives raw markdown; plain `gh issue view` gives terminal-rendered output
   - What's unclear: CONTEXT.md says "two gh CLI calls" with plain for "raw markdown body" - this may be a misunderstanding of gh CLI output
   - Recommendation: Use `--json title,body,labels,url` for ALL data including body. A second plain-text call is unnecessary and produces formatted (not raw markdown) output. If the intent was truly raw markdown, `--json body` is the correct source. Implement with single JSON call, document the deviation from CONTEXT.md.

2. **issue.md frontmatter serialization**
   - What we know: `stringifyFrontmatter` from `src/roadmap/frontmatter.ts` exists
   - What's unclear: Whether it handles arrays (labels) correctly in YAML
   - Recommendation: Test with arrays; if `stringifyFrontmatter` doesn't support arrays, use simple manual YAML construction for issue.md

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, configured in vitest.config.ts) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ISS-01 | fetchIssue calls gh CLI and returns structured data | unit | `npx vitest run tests/github/issues.test.ts -t "fetchIssue" -x` | No - Wave 0 |
| ISS-01 | --issue flag parsed and forwarded to createWorkstream | unit | `npx vitest run tests/cli/workstream.test.ts -t "issue" -x` | No - Wave 0 |
| ISS-01 | --issue and --feature mutually exclusive | unit | `npx vitest run tests/workstream/create.test.ts -t "mutually exclusive" -x` | No - Wave 0 |
| ISS-02 | Reverse-lookup finds feature by issue number (exact) | unit | `npx vitest run tests/workstream/create.test.ts -t "issue number" -x` | No - Wave 0 |
| ISS-02 | Reverse-lookup falls back to title similarity at 0.8 | unit | `npx vitest run tests/workstream/create.test.ts -t "title similarity" -x` | No - Wave 0 |
| ISS-02 | Error when no feature matches issue | unit | `npx vitest run tests/workstream/create.test.ts -t "no feature" -x` | No - Wave 0 |
| ISS-02 | Delegates to createFeatureLinkedWorkstream after match | unit | `npx vitest run tests/workstream/create.test.ts -t "feature-linked" -x` | No - Wave 0 |
| ISS-03 | issue.md written with YAML frontmatter and body | unit | `npx vitest run tests/workstream/issue-file.test.ts -x` | No - Wave 0 |
| ISS-03 | Context packet includes Issue Context section | unit | `npx vitest run tests/context/assemble.test.ts -t "issue" -x` | No - Wave 0 |
| ISS-03 | meta.issueNumber populated on creation | unit | `npx vitest run tests/workstream/create.test.ts -t "issueNumber" -x` | Partial (existing tests check null) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/github/issues.test.ts` -- add `fetchIssue` tests (file exists but needs new describe block)
- [ ] `tests/workstream/create.test.ts` -- add `createWorkstream with issueNumber` describe block (file exists)
- [ ] `tests/workstream/issue-file.test.ts` -- new file for writeIssueFile/readIssueFile
- [ ] `tests/context/assemble.test.ts` -- add issueContext tests (file exists)

## Sources

### Primary (HIGH confidence)
- `src/github/index.ts` -- ghExec, captureAssignee patterns
- `src/github/issues.ts` -- createIssue, updateIssue patterns
- `src/workstream/create.ts` -- createWorkstream, createFeatureLinkedWorkstream (full source reviewed)
- `src/state/meta.ts` -- createMeta signature and WorkstreamMeta interface
- `src/context/assemble.ts` -- AssemblyInput, assembleContext, STEP_SECTIONS
- `src/cli/context.ts` -- contextHandler with issueContext assembly point
- `src/roadmap/types.ts` -- Feature interface with `issue: number | null`
- `src/roadmap/similarity.ts` -- titleSimilarity, matchFeaturesByTitle
- `src/roadmap/feature-file.ts` -- readAllFeatures
- `tests/workstream/create.test.ts` -- existing test patterns for workstream creation
- `tests/github/index.test.ts` -- gh CLI mocking patterns

### Secondary (MEDIUM confidence)
- gh CLI documentation for `gh issue view --json` field format (labels as objects with `name`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing tools
- Architecture: HIGH - clear integration points identified from source code review
- Pitfalls: HIGH - based on direct code reading and gh CLI behavior knowledge

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain, no external dependencies changing)
