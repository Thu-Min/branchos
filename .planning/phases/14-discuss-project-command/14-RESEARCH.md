# Phase 14: Discuss Project Command - Research

**Researched:** 2026-03-11
**Domain:** Claude Code slash commands, interactive PR-FAQ creation, bookend pattern
**Confidence:** HIGH

## Summary

Phase 14 creates a `/branchos:discuss-project` slash command that guides developers through creating a PR-FAQ document via interactive conversation. The output must be compatible with the existing `ingest-prfaq` pipeline -- specifically, it writes a `PR-FAQ.md` file to the repo root that can then be ingested via `/branchos:ingest-prfaq`. The command follows the "bookend pattern" established in Phase 12's research command: the slash command frames the discussion (opening bookend), Claude drives the interactive conversation through PR-FAQ sections using AskUserQuestion, and the user explicitly triggers a save (closing bookend) which writes and commits the PR-FAQ.

The key architectural insight is that this is almost entirely a markdown slash command file -- no new TypeScript logic is needed for the interactive flow itself. The only TypeScript changes are registering the new command in the COMMANDS record (bumping count from 15 to 16) and updating tests. The PR-FAQ structure is already well-defined: 8 expected sections (headline, subheadline, problem, solution, quote, cta, customer-faq, internal-faq) validated by the existing `detectSections()` and `isLikelyPrfaq()` functions in `src/prfaq/validate.ts`. The command should guide users through these sections in a natural conversation flow, then produce a markdown file that passes validation.

**Primary recommendation:** Create a single markdown slash command (`commands/branchos:discuss-project.md`) that uses the bookend pattern from Phase 12, walks the user through PR-FAQ sections using AskUserQuestion, writes `PR-FAQ.md` to the repo root, and then runs `npx branchos ingest-prfaq --force` to complete ingestion. This keeps the pipeline clean -- discuss-project produces the input, ingest-prfaq handles storage and metadata.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | `/branchos:discuss-project` creates PR-FAQ through interactive guided conversation | Slash command uses AskUserQuestion + adaptive questioning to walk user through all 8 PR-FAQ sections. The 8 sections are defined in `src/prfaq/types.ts` EXPECTED_SECTIONS. |
| DISC-02 | Bookend pattern -- slash command frames discussion, Claude Code drives conversation, explicit save | Opening bookend: load codebase context + explain PR-FAQ format. Middle: Claude drives section-by-section conversation. Closing bookend: user says "save" or command detects all sections covered, then writes PR-FAQ.md and runs ingest. |
| DISC-03 | Output is structured PR-FAQ committed to git | Command writes PR-FAQ.md to repo root, then runs `npx branchos ingest-prfaq --force` which copies to `.branchos/shared/PR-FAQ.md`, writes metadata, and auto-commits. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude Code slash commands | Current | Interactive PR-FAQ creation flow | Native platform mechanism -- all BranchOS commands use this |
| AskUserQuestion | Built-in | Structured decision points and section drafting | Built-in Claude Code tool, proven in Phase 12 research command |
| `src/prfaq/validate.ts` | Existing | Section detection and validation | Already validates PR-FAQ structure with 8 expected sections |
| `src/prfaq/types.ts` | Existing | EXPECTED_SECTIONS definition | Defines the 8 sections the PR-FAQ must contain |
| `src/cli/ingest-prfaq.ts` | Existing | PR-FAQ storage, hashing, metadata, git commit | Reuse existing ingestion pipeline rather than reimplementing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Read, Glob, Grep | Built-in | Load codebase context for grounding PR-FAQ | Opening bookend -- reads ARCHITECTURE.md etc. |
| WebSearch, WebFetch | Built-in | Research domain/market if user needs help | During conversation when user asks for market context |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Write PR-FAQ.md then run ingest-prfaq | Write directly to .branchos/shared/ | Using ingest-prfaq reuses validation, hashing, metadata, and commit logic. Direct write would duplicate all of that. |
| Single combined discuss+save command | Separate --save flag (like research) | PR-FAQ is a single coherent document unlike research artifacts. A single session produces one output, so embedded save is simpler. |
| TypeScript interactive handler | Markdown slash command | Zero new runtime code needed. Claude's conversation IS the interactive handler. |

**Installation:**
```bash
# No new npm packages needed. Zero new dependencies (per REQUIREMENTS.md constraint).
# The slash command file is installed via existing `npx branchos install-commands`.
```

## Architecture Patterns

### Recommended Project Structure
```
commands/
  branchos:discuss-project.md     # NEW - the interactive PR-FAQ creation command
src/
  commands/
    index.ts                      # UPDATE - add discuss-project to COMMANDS record
tests/
  commands/
    index.test.ts                 # UPDATE - expect 16 commands (was 15)
    discuss-project-command.test.ts  # NEW - validates command file content
```

### Pattern 1: Bookend Pattern (Adapted from Phase 12 Research Command)
**What:** The slash command defines opening context loading, the interactive middle where Claude guides through PR-FAQ sections, and the closing save/commit flow.
**When to use:** This is the required pattern per DISC-02.
**Example:**
```markdown
# Discuss Project

## Step 1: Frame the discussion (Opening Bookend)
Load codebase context. Explain PR-FAQ format.
Check if PR-FAQ.md already exists (offer to refine vs create new).

## Step 2: Interactive PR-FAQ creation (Claude Drives)
Walk through sections using AskUserQuestion.
Adapt questioning based on responses.

## Step 3: Save PR-FAQ (Closing Bookend)
Compile sections into PR-FAQ.md format.
Write to repo root. Run ingest-prfaq for storage.
```

### Pattern 2: Section-Guided Conversation
**What:** Rather than asking all 8 sections rigidly, the command groups related sections and lets the conversation flow naturally. The press release "story" sections (headline, subheadline, problem, solution, quote, CTA) flow as a narrative, then FAQ sections come after.
**When to use:** Always -- this is the natural PR-FAQ flow.
**Example flow:**
```
1. "What project are you building? Who is it for?" → feeds headline, subheadline
2. "What problem does it solve?" → feeds problem section
3. "How does it solve it?" → feeds solution section
4. "Why is this the right approach?" → feeds leadership quote
5. "How do users get started?" → feeds CTA
6. "What would customers ask?" → feeds customer FAQ
7. "What would stakeholders ask?" → feeds internal FAQ
```

### Pattern 3: Reuse Existing Ingestion Pipeline
**What:** The discuss-project command writes `PR-FAQ.md` to the repo root, then delegates to the existing `ingest-prfaq` command for validation, storage, hashing, and commit.
**When to use:** Always -- avoids duplicating the ingest logic.
**Example:**
```markdown
## Save Flow
1. Write compiled PR-FAQ to ./PR-FAQ.md using the Write tool
2. Run: `npx branchos ingest-prfaq --force`
3. Report success to user with section summary
```

### Anti-Patterns to Avoid
- **Building a TypeScript interactive loop:** Claude Code's conversation IS the interactive loop. No programmatic interaction handling needed.
- **Rigid section-by-section questioning:** The command should guide through sections naturally, not ask "Now enter your headline. Now enter your subheadline." in rigid order. DISC-01 says "guided conversation" not "form filling."
- **Reimplementing ingest logic:** Do NOT duplicate hash computation, metadata writing, or git commit logic. Delegate to `npx branchos ingest-prfaq --force`.
- **Skipping validation:** The ingest pipeline validates section coverage. By using it, we get free validation that the PR-FAQ has the expected structure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PR-FAQ validation | Custom section checker in command | `ingest-prfaq` pipeline (uses `detectSections`) | Already handles section detection, fuzzy matching, warnings |
| PR-FAQ storage | Write directly to `.branchos/shared/` | `npx branchos ingest-prfaq --force` | Handles hashing, metadata, diff detection, git commit |
| Interactive prompting | Custom input loop | Claude's AskUserQuestion tool | Native, proven in Phase 12 |
| Section structure | Ad-hoc markdown format | Match EXPECTED_SECTIONS from `src/prfaq/types.ts` | Guarantees compatibility with ingest validation |

**Key insight:** This phase is primarily a well-crafted markdown prompt file (the slash command) plus minimal registration boilerplate. The "intelligence" is Claude following the command's conversation guidelines, and the "persistence" is the existing ingest-prfaq pipeline.

## Common Pitfalls

### Pitfall 1: PR-FAQ Output Not Matching Expected Sections
**What goes wrong:** Claude generates a PR-FAQ with section headings that do not match the patterns in `EXPECTED_SECTIONS` (e.g., "Background" instead of "Problem", or "How It Works" instead of "Solution").
**Why it happens:** The slash command does not explicitly reference the expected section heading patterns.
**How to avoid:** The command file must include the exact section headings expected by `detectSections()`. Reference the 8 sections by their canonical names: Headline, Subheadline, Problem, Solution, Quote, Call to Action, Customer FAQ, Internal FAQ.
**Warning signs:** `ingest-prfaq` reports missing sections after `discuss-project` generates the document.

### Pitfall 2: Not Including AskUserQuestion in allowed-tools
**What goes wrong:** Claude asks for permission every time it wants to ask the user a question, breaking the interactive flow.
**Why it happens:** `allowed-tools` frontmatter restricts which tools Claude can use without asking permission.
**How to avoid:** Include `AskUserQuestion` in the `allowed-tools` frontmatter field explicitly.
**Warning signs:** Users report being prompted to approve every question Claude asks.

### Pitfall 3: Command Count Mismatch
**What goes wrong:** Tests fail because EXPECTED_FILES array or count expectations are not updated from 15 to 16.
**Why it happens:** Adding a new command file without updating all three test files that check command counts.
**How to avoid:** Update `tests/commands/index.test.ts` (EXPECTED_FILES array + count), `tests/cli/install-commands.test.ts` (count expectations in 4 places: "has exactly 16 entries", "writes 16 files to commands/", "writes 16 files to skills/", "removes 16 files").
**Warning signs:** `npx vitest run tests/commands/ tests/cli/install-commands.test.ts` shows failures.

### Pitfall 4: Not Handling Existing PR-FAQ
**What goes wrong:** User runs `/branchos:discuss-project` when a PR-FAQ already exists. The command blindly overwrites it.
**Why it happens:** The command does not check for existing `.branchos/shared/PR-FAQ.md` or `./PR-FAQ.md`.
**How to avoid:** The opening bookend should check if a PR-FAQ already exists. If it does, offer to refine/update the existing document rather than starting from scratch. The `ingest-prfaq` handler already supports the "updated" action with diffing.
**Warning signs:** Users lose their existing PR-FAQ without warning.

### Pitfall 5: Saving Before All Sections Are Covered
**What goes wrong:** User asks to save before covering all 8 sections, producing an incomplete PR-FAQ.
**Why it happens:** No explicit section tracking in the conversation flow.
**How to avoid:** Before saving, the command should instruct Claude to review which sections have been covered and warn about missing ones. Use `isLikelyPrfaq` threshold (2+ sections) as minimum, but recommend all 8.
**Warning signs:** `ingest-prfaq` reports multiple missing sections with warnings.

## Code Examples

Verified patterns from the existing codebase:

### Existing Command Frontmatter Pattern
```yaml
# Source: commands/branchos:research.md
---
description: Start an interactive research session or save findings
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *), WebSearch, WebFetch, AskUserQuestion
---
```

### Discuss-Project Command Frontmatter (Recommended)
```yaml
---
description: Create a PR-FAQ document through guided interactive discussion
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *), WebSearch, WebFetch, AskUserQuestion
---
```

### COMMANDS Record Registration Pattern
```typescript
// Source: src/commands/index.ts
import discussProject from '../../commands/branchos:discuss-project.md';

export const COMMANDS: Record<string, string> = {
  // ... existing 15 entries ...
  'branchos:discuss-project.md': discussProject,
};
```

### Expected PR-FAQ Section Headings (Must Match Validation)
```typescript
// Source: src/prfaq/types.ts
export const EXPECTED_SECTIONS: SectionDefinition[] = [
  { id: 'headline', patterns: ['headline', 'title', 'press release'] },
  { id: 'subheadline', patterns: ['subheadline', 'subtitle', 'sub-headline'] },
  { id: 'problem', patterns: ['problem', 'customer problem'] },
  { id: 'solution', patterns: ['solution'] },
  { id: 'quote', patterns: ['quote', 'leadership quote', 'customer quote'] },
  { id: 'cta', patterns: ['call to action', 'cta', 'getting started', 'how to get started'] },
  { id: 'customer-faq', patterns: ['customer faq', 'external faq', 'customer questions'] },
  { id: 'internal-faq', patterns: ['internal faq', 'stakeholder faq', 'internal questions'] },
];
```

### Ingestion Command Delegation
```markdown
## Save Flow
Write the PR-FAQ to `./PR-FAQ.md` then run:
```bash
npx branchos ingest-prfaq --force
```
This handles: validation, section detection, hashing, metadata, storage to .branchos/shared/, and git commit.
```

### Dynamic Context Injection (Opening Bookend)
```markdown
## Codebase Context
- Architecture: !`cat .branchos/shared/codebase/ARCHITECTURE.md 2>/dev/null || echo "No codebase map found. Run /branchos:map-codebase first."`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual PR-FAQ writing then ingest | Guided interactive creation via slash command | Phase 14 (new) | Lowers barrier -- developers do not need to know PR-FAQ format |
| Separate discuss + separate ingest steps | Discuss-project creates and auto-ingests in one flow | Phase 14 (new) | Streamlined -- one command handles both creation and storage |

**Deprecated/outdated:**
- None relevant. The slash command pattern, COMMANDS registration, and ingest pipeline are all current.

## Open Questions

1. **Should discuss-project support refining an existing PR-FAQ?**
   - What we know: `ingest-prfaq` supports "updated" action with section-level diffing. The opening bookend should check for existing PR-FAQ.
   - What's unclear: Whether the conversation flow should load the existing PR-FAQ content and allow section-by-section refinement, or always produce a complete new document.
   - Recommendation: Check for existing PR-FAQ in the opening bookend. If it exists, offer two modes: (1) refine specific sections, or (2) start fresh. For initial implementation, "start fresh with warning" is simpler and still passes all requirements.

2. **Should the command use `!`backtick`` for pre-loading codebase context?**
   - What we know: Phase 12 research recommended this for small context. ARCHITECTURE.md may vary in size.
   - What's unclear: Whether the codebase map might be too large for injection.
   - Recommendation: Use `!`backtick`` for ARCHITECTURE.md (most useful for PR-FAQ context). If it does not exist, the command still works -- just with less grounding.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/commands/index.test.ts tests/commands/discuss-project-command.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | Command file exists with AskUserQuestion in allowed-tools | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-01 | Command file contains section-guided conversation instructions | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-01 | Command references all 8 PR-FAQ sections | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-02 | Command contains opening bookend (context loading) | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-02 | Command contains closing bookend (save/commit flow) | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-03 | Command references PR-FAQ.md output and ingest-prfaq | unit | `npx vitest run tests/commands/discuss-project-command.test.ts -x` | Wave 0 |
| DISC-03 | COMMANDS record has 16 entries | unit | `npx vitest run tests/commands/index.test.ts -x` | Needs update |
| DISC-03 | install-commands installs 16 files | unit | `npx vitest run tests/cli/install-commands.test.ts -x` | Needs update |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/commands/ tests/cli/install-commands.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/commands/discuss-project-command.test.ts` -- validates command file content (AskUserQuestion in allowed-tools, section references, bookend pattern, save flow, ingest-prfaq delegation)
- [ ] Update `tests/commands/index.test.ts` -- EXPECTED_FILES array needs `branchos:discuss-project.md`, count from 15 to 16
- [ ] Update `tests/cli/install-commands.test.ts` -- count expectations from 15 to 16 (in 4 places)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/prfaq/types.ts` -- EXPECTED_SECTIONS defining the 8 PR-FAQ sections
- Existing codebase: `src/prfaq/validate.ts` -- `detectSections()` and `isLikelyPrfaq()` validation
- Existing codebase: `src/cli/ingest-prfaq.ts` -- complete ingestion pipeline with hashing, metadata, git commit
- Existing codebase: `commands/branchos:research.md` -- bookend pattern reference implementation from Phase 12
- Existing codebase: `src/commands/index.ts` -- COMMANDS registration pattern (currently 15 entries)
- Existing codebase: `tests/commands/research-command.test.ts` -- test pattern for validating command file content
- Phase 12 research: `.planning/phases/12-interactive-research-command/12-RESEARCH.md` -- bookend pattern, AskUserQuestion patterns

### Secondary (MEDIUM confidence)
- `.planning/v2-VISION.md` -- discuss-project command purpose and workflow positioning

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing project patterns, no new dependencies
- Architecture: HIGH - bookend pattern proven in Phase 12, ingest pipeline proven in production
- Pitfalls: HIGH - derived from actual codebase analysis (15-to-16 count, EXPECTED_SECTIONS matching, existing PR-FAQ handling)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- slash command format and ingest pipeline are well-established)
