# Phase 13: Context Assembly Integration - Research

**Researched:** 2026-03-11
**Domain:** Context packet assembly, research artifact integration
**Confidence:** HIGH

## Summary

Phase 13 wires research artifacts (built in Phase 11) into the existing context assembly pipeline so that `/branchos:discuss-phase` and `/branchos:plan-roadmap` automatically include research summaries. The work is narrowly scoped: extend `AssemblyInput` with a new optional field for research summaries, add a `researchSummaries` key to `STEP_SECTIONS`, update the `contextHandler` to read and filter research artifacts, and update two slash command markdown files to mention research context in their gather-context steps.

The codebase already has all the building blocks: `readAllResearch()` reads artifacts, `extractSummary()` extracts summary sections, `findResearchByFeature()` filters by feature linkage, and the context assembly is a pure function that takes an `AssemblyInput` and returns a `ContextPacket`. The integration pattern was established by the `featureContext` field (added in Phase 8) -- research context follows the same pattern.

**Primary recommendation:** Add `researchSummaries: string | null` to `AssemblyInput`, add a `'researchSummaries'` key to the `discuss` and `plan` entries in `STEP_SECTIONS`, gather summaries in `contextHandler`, and update the two slash commands. All changes are backward compatible because null values are already handled gracefully.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CTX-01 | Research findings flow into discuss/plan context packets automatically | Extend AssemblyInput with researchSummaries field; add to STEP_SECTIONS for discuss and plan steps; gather in contextHandler |
| CTX-02 | Context assembly uses summaries (not full artifacts) to manage context window | Use extractSummary() on each artifact body; concatenate summaries with topic headers |
| CTX-03 | Backward compatible -- commands work unchanged when no research exists | researchSummaries defaults to null; null handling already built into assembleContext pattern |
| RES-01 | /branchos:discuss-phase includes domain research grounded in codebase context | Update discuss-phase.md Step 3 to mention research context is auto-included via /context |
| RES-02 | /branchos:plan-roadmap includes domain research before generating roadmap | Update plan-roadmap.md to read research summaries before roadmap generation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | (project version) | Test framework | Already used across all 219+ tests |
| TypeScript | (project version) | Type safety | Project language |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs/promises | built-in | File I/O for reading research | Already used in research-file.ts |
| node:path | built-in | Path manipulation | Already used throughout |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Concatenating summaries into single string | Passing structured array of {topic, summary} | Single string is simpler, matches existing pattern (featureContext is a single string). Array would allow per-topic rendering but adds complexity without benefit since the consumer is a markdown context packet |

**Installation:**
No new dependencies required. Zero new deps is a locked project decision.

## Architecture Patterns

### Recommended Changes

```
src/
  context/
    assemble.ts          # Add researchSummaries to AssemblyInput and STEP_SECTIONS
  cli/
    context.ts           # Add research summary gathering to contextHandler
commands/
  branchos:discuss-phase.md  # Update Step 3 to mention research auto-inclusion
  branchos:plan-roadmap.md   # Add step to read research before generation
tests/
  context/
    assemble.test.ts     # Add tests for researchSummaries section
  cli/
    context.test.ts      # Add integration test for research in context packet
```

### Pattern 1: AssemblyInput Extension (Follow featureContext Pattern)

**What:** Add `researchSummaries: string | null` to `AssemblyInput` interface, matching the exact pattern used for `featureContext`.

**When to use:** This is the standard pattern for adding optional context sections.

**Example:**
```typescript
// In src/context/assemble.ts
export interface AssemblyInput {
  // ... existing fields ...
  featureContext: string | null;
  researchSummaries: string | null;  // NEW
}
```

### Pattern 2: STEP_SECTIONS Configuration

**What:** Add `'researchSummaries'` to the arrays for `discuss` and `plan` steps. Position it after `featureContext` so research context appears early in the packet.

**Example:**
```typescript
const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss: ['featureContext', 'researchSummaries', 'architecture', 'conventions', 'decisions', 'branchDiff'],
  plan: ['featureContext', 'researchSummaries', 'discuss', 'modules', 'conventions', 'decisions', 'branchDiff'],
  execute: ['featureContext', 'plan', 'execute', 'branchDiff', 'decisions'],
  fallback: ['featureContext', 'architecture', 'conventions', 'decisions', 'branchDiff', 'hint'],
};
```

Note: Research summaries are NOT included in `execute` or `fallback` steps -- execution should follow the plan, not re-read research. This keeps context budgets tight.

### Pattern 3: Research Summary Gathering in contextHandler

**What:** In `contextHandler`, read all research artifacts, extract summaries, filter by relevance (feature linkage if workstream has featureId), and concatenate into a single string.

**Example:**
```typescript
// In src/cli/context.ts
import { readAllResearch } from '../research/research-file.js';
import { extractSummary } from '../research/extract-summary.js';
import { RESEARCH_DIR } from '../constants.js';

// Inside contextHandler, after loading feature context:
let researchSummaries: string | null = null;
try {
  const researchDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, RESEARCH_DIR);
  const artifacts = await readAllResearch(researchDir);

  if (artifacts.length > 0) {
    // Filter: if workstream is linked to a feature, prefer feature-linked research
    // But also include unlinked research (features: []) as general context
    const relevant = meta?.featureId
      ? artifacts.filter(a => a.features.length === 0 || a.features.includes(meta.featureId!))
      : artifacts;

    const summaryParts: string[] = [];
    for (const artifact of relevant) {
      const summary = extractSummary(artifact.body);
      if (summary) {
        summaryParts.push(`### ${artifact.topic} (${artifact.id})\n\n${summary}`);
      }
    }

    if (summaryParts.length > 0) {
      researchSummaries = summaryParts.join('\n\n');
    }
  }
} catch {
  // Research dir missing or unreadable - proceed without research context
}
```

### Pattern 4: getSection Case for Research

**What:** Add a case to the `getSection` switch statement.

**Example:**
```typescript
case 'researchSummaries':
  return buildSection(
    'Research',
    input.researchSummaries,
    'No research findings available.',
  );
```

### Pattern 5: Slash Command Updates

**What:** Update the two slash commands to mention that research is now auto-included.

For `branchos:discuss-phase.md` Step 3 (Gather context):
```markdown
- Read any available research summaries from `.branchos/shared/research/` (auto-included via context assembly when research artifacts exist).
```

For `branchos:plan-roadmap.md`, add a note before Step 2:
```markdown
**Research context:** If research artifacts exist in `.branchos/shared/research/`, their summaries are automatically available. Use them to inform milestone/feature decisions.
```

### Anti-Patterns to Avoid
- **Including full research artifact bodies in context:** The whole point of CTX-02 is to use summaries only. Full artifacts would blow up context windows.
- **Making research a required dependency:** CTX-03 requires backward compatibility. Never error when research is missing.
- **Adding research to execute step:** Execution follows the plan. Adding research to execute would add noise and waste context budget.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Summary extraction | Custom parser | `extractSummary()` from Phase 11 | Already handles edge cases (no summary, empty summary, last section) |
| Research file reading | Custom file reader | `readAllResearch()` from Phase 11 | Already handles missing dir, sorts by ID |
| Feature-filtered lookup | Custom filter | `findResearchByFeature()` from Phase 11 | Already reads index.json and filters |
| Context section rendering | Custom formatter | `buildSection()` in assemble.ts | Already handles null gracefully |

**Key insight:** Phase 11 built all the primitives. Phase 13 is purely a wiring/integration task.

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests by Changing AssemblyInput
**What goes wrong:** Adding a required field to `AssemblyInput` breaks all test helpers that construct input objects.
**Why it happens:** `makeInput()` in assemble.test.ts builds a complete AssemblyInput.
**How to avoid:** Add `researchSummaries: null` as the default in `makeInput()`. This ensures all existing tests pass without modification.
**Warning signs:** Test failures in assemble.test.ts after modifying the interface.

### Pitfall 2: Context Window Bloat from Too Many Research Artifacts
**What goes wrong:** If a project has 20+ research artifacts, concatenating all summaries creates a huge context section.
**Why it happens:** `readAllResearch()` returns everything.
**How to avoid:** Filter by feature relevance first. For general (unlinked) workstreams, consider a reasonable cap (e.g., only `status: 'complete'` artifacts, skip `draft`). Each summary is typically 3-5 bullet points, so even 10 artifacts would be manageable.
**Warning signs:** Context packet raw output exceeding ~5000 characters for the research section alone.

### Pitfall 3: plan-roadmap Is Not a Context Packet Consumer
**What goes wrong:** Trying to modify `planRoadmapHandler` to accept research via `AssemblyInput`.
**Why it happens:** RES-02 says "plan-roadmap includes research" but plan-roadmap is a slash command driven by Claude Code, not a programmatic context assembly consumer.
**How to avoid:** For plan-roadmap, the integration is at the slash command level (the markdown instructions tell Claude to read research), not at the TypeScript level. The `branchos:plan-roadmap.md` command instructions should tell Claude to check `.branchos/shared/research/` for relevant findings.
**Warning signs:** Trying to add research fields to `PlanRoadmapOptions`.

### Pitfall 4: Circular Import from Research in Context
**What goes wrong:** Import cycle between context and research modules.
**Why it happens:** If research module ever imports from context module.
**How to avoid:** Research module has no dependency on context module (verified). The dependency is one-way: context -> research. Safe to import.
**Warning signs:** TypeScript circular dependency errors at build time.

## Code Examples

### Complete getSection Addition
```typescript
// Source: follows existing pattern in src/context/assemble.ts
case 'researchSummaries':
  return buildSection(
    'Research',
    input.researchSummaries,
    'No research findings available.',
  );
```

### Test Pattern for Research in Context
```typescript
// Source: follows existing pattern in tests/context/assemble.test.ts
describe('researchSummaries', () => {
  it('produces NO Research section when researchSummaries is null', () => {
    const input = makeInput({ detectedStep: 'discuss', researchSummaries: null });
    const result = assembleContext(input);
    const sectionNames = result.sections.map(s => s.name);
    expect(sectionNames).not.toContain('Research');
  });

  it('includes Research section in discuss step when summaries provided', () => {
    const input = makeInput({
      detectedStep: 'discuss',
      researchSummaries: '### Auth Patterns (R-001)\n\n- Use JWT tokens\n- Rotate keys',
    });
    const result = assembleContext(input);
    expect(result.raw).toContain('Research');
    expect(result.raw).toContain('Use JWT tokens');
  });

  it('includes Research section in plan step when summaries provided', () => {
    const input = makeInput({
      detectedStep: 'plan',
      researchSummaries: '### Auth Patterns (R-001)\n\n- Use JWT tokens',
    });
    const result = assembleContext(input);
    expect(result.raw).toContain('Research');
  });

  it('does NOT include Research section in execute step', () => {
    const input = makeInput({
      detectedStep: 'execute',
      researchSummaries: '### Auth Patterns (R-001)\n\n- Use JWT tokens',
    });
    const result = assembleContext(input);
    const sectionNames = result.sections.map(s => s.name);
    expect(sectionNames).not.toContain('Research');
  });
});
```

### Integration Test for contextHandler with Research
```typescript
// Source: follows existing pattern in tests/cli/context.test.ts
it('includes research summaries in context packet when research exists', async () => {
  initGitRepo(tempDir);
  const wsDir = await setupWorkstream(tempDir, 'test-ws', {
    schemaVersion: 2,
    status: 'active',
    currentPhase: 1,
    phases: [{ number: 1, status: 'active', discuss: { status: 'not-started' }, plan: { status: 'not-started' }, execute: { status: 'not-started' } }],
    tasks: [],
  });

  // Create research artifact
  const researchDir = join(tempDir, '.branchos', 'shared', 'research');
  await mkdir(researchDir, { recursive: true });
  await writeFile(join(researchDir, 'R-001-auth-patterns.md'), `---
id: R-001
topic: Auth Patterns
status: complete
date: 2026-03-11
features: []
---

## Summary

- Use JWT tokens for stateless auth
- Rotate signing keys monthly

## Findings

Detailed findings here...
`);
  // Also create index.json
  await writeFile(join(researchDir, 'index.json'), JSON.stringify([
    { id: 'R-001', topic: 'Auth Patterns', status: 'complete', date: '2026-03-11', features: [], filename: 'R-001-auth-patterns.md' }
  ]));

  const { contextHandler } = await import('../../src/cli/context.js');
  const result = await contextHandler('discuss', { cwd: tempDir });
  expect(result).not.toBeNull();
  expect(result!.raw).toContain('Research');
  expect(result!.raw).toContain('Use JWT tokens');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual research reference | Auto-included summaries | Phase 13 (this phase) | Research flows into workflow automatically |
| Full artifact in context | Summary-only extraction | Phase 11 (extractSummary) | Context window budget preserved |

## Open Questions

1. **Should research be filtered by status?**
   - What we know: Research artifacts have `status: 'draft' | 'complete'`
   - What's unclear: Should draft research be included in context packets?
   - Recommendation: Only include `status: 'complete'` artifacts. Draft research may be incomplete or incorrect.

2. **Feature-scoped filtering for plan-roadmap**
   - What we know: plan-roadmap operates at project level (all features), not workstream level
   - What's unclear: Should plan-roadmap see ALL research or only feature-linked research?
   - Recommendation: Include ALL complete research for plan-roadmap since it operates at the project level. Feature filtering only makes sense for workstream-scoped commands.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (project version) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/context/assemble.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | Research summaries appear in discuss/plan context packets | unit | `npx vitest run tests/context/assemble.test.ts -x` | Exists (needs new tests) |
| CTX-02 | Summaries used, not full artifacts | unit | `npx vitest run tests/context/assemble.test.ts -x` | Exists (needs new tests) |
| CTX-03 | Commands work when no research exists | unit | `npx vitest run tests/context/assemble.test.ts -x` | Exists (covered by existing null tests + new null test) |
| RES-01 | discuss-phase includes research | integration | `npx vitest run tests/cli/context.test.ts -x` | Exists (needs new test) |
| RES-02 | plan-roadmap includes research | manual-only | Slash command behavior (markdown file update) | N/A -- slash command instructions |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/context/assemble.test.ts tests/cli/context.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. New test cases need to be added to existing test files, not new files.

## Sources

### Primary (HIGH confidence)
- `src/context/assemble.ts` -- Current context assembly implementation, pure function pattern
- `src/cli/context.ts` -- Current context handler with I/O, feature context gathering pattern
- `src/research/research-file.ts` -- readAllResearch, writeResearchFile
- `src/research/extract-summary.ts` -- extractSummary function
- `src/research/research-index.ts` -- findResearchByFeature, readIndex
- `src/research/types.ts` -- ResearchArtifact, ResearchIndexEntry types
- `tests/context/assemble.test.ts` -- Existing test patterns including featureContext tests
- `commands/branchos:discuss-phase.md` -- Current slash command instructions
- `commands/branchos:plan-roadmap.md` -- Current slash command instructions
- `.planning/REQUIREMENTS.md` -- CTX-01, CTX-02, CTX-03, RES-01, RES-02 definitions

### Secondary (MEDIUM confidence)
- None needed -- all information sourced from codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all existing code
- Architecture: HIGH - Following established featureContext pattern exactly
- Pitfalls: HIGH - Identified from direct code analysis of existing patterns and test structure

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable internal architecture)
