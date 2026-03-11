# Phase 12: Interactive Research Command - Research

**Researched:** 2026-03-11
**Domain:** Claude Code slash commands / skills, interactive conversational flows, research artifact persistence
**Confidence:** HIGH

## Summary

Phase 12 creates a `/branchos:research` slash command that enables interactive, conversational research sessions. The key architectural insight is that Claude Code slash commands are markdown prompt files -- they instruct Claude what to do, and Claude uses its native conversation capabilities (including the built-in `AskUserQuestion` tool) to drive interactive flows. There is no programmatic REPL or interactive framework to build. The "bookend pattern" referenced in the roadmap means: the slash command frames the research session at start (loading context, setting up the topic), Claude drives the conversational middle, and the user explicitly saves at the end with `--save`.

The implementation requires: (1) a new markdown slash command file `branchos:research.md`, (2) registering it in the COMMANDS record and updating the install system, and (3) updating tests. The command uses the Phase 11 research storage layer (`writeResearchFile`, `readIndex`, `nextResearchId`) for persistence. No new runtime dependencies are needed -- Claude Code's built-in tools (AskUserQuestion, WebSearch, WebFetch, Read, Glob, Grep) power the research.

**Primary recommendation:** Create a single, well-structured markdown slash command that uses Claude Code's native AskUserQuestion tool for structured decision points and leverages the conversation loop for adaptive questioning. The command file is the entire "interactive flow" -- no TypeScript logic needed for the interaction itself.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INT-01 | Slash commands use AskUserQuestion for structured decision points (options, multi-select) | AskUserQuestion is a built-in Claude Code tool available by default. The slash command markdown instructs Claude to present structured options. Include it in `allowed-tools` frontmatter to auto-approve. |
| INT-02 | Slash commands support freeform follow-up when user selects "Other" or wants to explain | AskUserQuestion supports freeform text responses naturally. The slash command instructs Claude to always include an "Other (describe)" option and to accept freeform follow-up. |
| INT-03 | Interactive flow guides users through research/discuss with adaptive questioning (not rigid scripts) | Slash command instructions tell Claude to adapt its questioning based on responses. Claude's natural conversation capabilities handle this -- the command provides guardrails and structure, not a rigid script. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Claude Code slash commands | Current | Interactive research flow | Native platform mechanism -- commands are markdown prompts that Claude follows |
| AskUserQuestion | Built-in | Structured decision points | Built-in Claude Code tool, auto-approved when listed in `allowed-tools` |
| Phase 11 research store | v2.0.1 | `writeResearchFile`, `readIndex`, `nextResearchId` | Already built and tested -- persistence layer for research artifacts |
| simple-git | ^3.27.0 | Git commit after save | Already a project dependency, used via `GitOps` class or `Bash(git *)` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| WebSearch | Built-in | Domain research during session | Claude uses this tool to research topics during the conversation |
| WebFetch | Built-in | Fetch specific URLs/docs | Claude uses this for targeted documentation fetching |
| Read, Glob, Grep | Built-in | Codebase exploration | Claude uses these to ground research in the actual codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Slash command (.md) | Skill (SKILL.md in directory) | Skills support directory structure and supporting files, but existing BranchOS commands all use `.claude/commands/` pattern. Consistency wins -- use command format. |
| `context: fork` subagent | Inline (default) | Forked context loses conversation history. Research needs back-and-forth, so inline is correct. |

**Installation:**
```bash
# No new npm packages needed. Zero new dependencies (per REQUIREMENTS.md constraint).
# The slash command file is installed via existing `npx branchos install-commands`.
```

## Architecture Patterns

### Recommended Project Structure
```
commands/
  branchos:research.md          # NEW - the interactive research command
src/
  commands/
    index.ts                    # UPDATE - add research command to COMMANDS record
tests/
  commands/
    index.test.ts               # UPDATE - expect 15 commands (was 14)
```

### Pattern 1: Bookend Pattern for Interactive Commands
**What:** The slash command defines the opening (context loading, topic framing) and closing (save/commit) of a workflow. Claude's natural conversation drives the middle.
**When to use:** Any interactive workflow where the user and Claude go back and forth.
**Example:**
```markdown
# Research Session

## Step 1: Frame the research (OPENING BOOKEND)
Parse $ARGUMENTS to extract the topic and any flags (--save).
Load codebase context. Present the research question.

## Step 2: Interactive research (CLAUDE DRIVES)
Use AskUserQuestion to present structured options.
Adapt questioning based on responses.
Use WebSearch/WebFetch/Read for actual research.

## Step 3: Save findings (CLOSING BOOKEND - triggered by --save)
Compile findings into research artifact format.
Write using writeResearchFile API. Git commit.
```

### Pattern 2: Structured Decision Points via AskUserQuestion
**What:** The slash command instructs Claude to present numbered options rather than open-ended questions at key decision points, while always including a freeform "Other" escape hatch.
**When to use:** When guiding the user through research direction choices.
**Example:**
```markdown
Present the user with research direction options:

"I've identified these potential research areas for [topic]:
1. [Area based on codebase analysis]
2. [Area based on domain knowledge]
3. [Area based on current architecture]
4. Other (describe what you'd like to explore)

Which direction would you like to start with?"

Wait for the user's response before proceeding.
```

### Pattern 3: Argument Parsing in Slash Commands
**What:** The `$ARGUMENTS` placeholder receives everything after the command name. The slash command instructs Claude to parse flags and positional arguments from this string.
**When to use:** When a command needs flags like `--save` alongside a topic argument.
**Example:**
```markdown
Parse $ARGUMENTS:
- If it contains `--save`, this is a save request
- If it contains `--list`, list existing research
- Otherwise, treat the entire string as the research topic
```

### Anti-Patterns to Avoid
- **Building a TypeScript interactive loop:** Claude Code's conversation IS the interactive loop. Do not build programmatic interaction handling.
- **Using `context: fork`:** Forked subagents lose conversation history and cannot do back-and-forth with the user. Research sessions MUST run inline.
- **Rigid step-by-step scripts:** The command should give Claude guidelines for adapting, not a rigid "ask question A, then question B, then question C" script. INT-03 explicitly requires adaptive questioning.
- **Custom REPL/terminal interaction:** Explicitly out of scope per REQUIREMENTS.md. Claude Code's conversation loop handles all interactivity.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive prompting | Custom REPL or input loop | Claude's AskUserQuestion tool | Claude Code handles this natively; building custom is out of scope |
| Web research | Custom HTTP client or scraper | Claude's WebSearch + WebFetch | Zero new deps constraint; these are the research engine |
| Research persistence | New storage format | Phase 11 `writeResearchFile` | Already built, tested, with frontmatter and index system |
| Git operations | Custom git wrapper | `Bash(git *)` in allowed-tools | Existing pattern in all BranchOS commands |
| Codebase context loading | Custom file scanner | `Read`, `Glob`, `Grep` tools + codebase map | Claude Code's tools plus existing `.branchos/shared/codebase/` |

**Key insight:** This phase is primarily a well-crafted markdown prompt file. The TypeScript changes are minimal (register the new command, update test expectations). The interactive "intelligence" comes from Claude following the command's instructions, not from code.

## Common Pitfalls

### Pitfall 1: Overengineering the Command File
**What goes wrong:** Writing extremely detailed step-by-step instructions that make the flow rigid rather than adaptive.
**Why it happens:** Treating the slash command like a program specification rather than conversational guidelines.
**How to avoid:** Write guidelines and decision trees, not rigid scripts. Use phrases like "adapt based on the user's response" and "if the user indicates X, shift to exploring Y."
**Warning signs:** The command file reads like pseudocode instead of natural language instructions.

### Pitfall 2: Forgetting the --save Flag Parse
**What goes wrong:** User invokes `/branchos:research --save` but Claude starts a new research session instead of saving the current one.
**Why it happens:** `$ARGUMENTS` receives the entire string including flags. Without explicit parsing instructions, Claude treats `--save` as part of the topic.
**How to avoid:** The command file must explicitly instruct Claude to check for `--save` flag before anything else and branch to the save flow.
**Warning signs:** The `--save` handling is buried deep in the command rather than being the first check.

### Pitfall 3: Not Including AskUserQuestion in allowed-tools
**What goes wrong:** Claude asks for permission every time it wants to ask the user a question, breaking the interactive flow.
**Why it happens:** `allowed-tools` frontmatter restricts which tools Claude can use without asking permission.
**How to avoid:** Include `AskUserQuestion` in the `allowed-tools` frontmatter field explicitly.
**Warning signs:** Users report being prompted to approve every question Claude asks.

### Pitfall 4: Command File Not Registered in COMMANDS Record
**What goes wrong:** The `.md` file exists in `commands/` directory but `npx branchos install-commands` does not install it.
**Why it happens:** The `src/commands/index.ts` must import and register each command explicitly.
**How to avoid:** Add the import and COMMANDS entry. Update the test expectation from 14 to 15 commands.
**Warning signs:** `install-commands` reports installing 14 files instead of 15.

### Pitfall 5: Research Artifact Missing Summary Section
**What goes wrong:** The save flow writes a research artifact without a `## Summary` section, breaking downstream Phase 13 consumption.
**Why it happens:** The command instructs Claude to compile findings but does not mandate the `## Summary` section format.
**How to avoid:** The save step must explicitly instruct Claude to write a `## Summary` section as the first H2, following the convention from Phase 11.
**Warning signs:** `extractSummary()` returns `null` for saved research artifacts.

## Code Examples

Verified patterns from the existing codebase:

### Existing Command Frontmatter Pattern
```yaml
# Source: commands/branchos:discuss-phase.md
---
description: Create or update discussion context for current workstream phase
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *)
---
```

### Research Command Frontmatter (Recommended)
```yaml
---
description: Start an interactive research session or save findings
allowed-tools: Read, Glob, Grep, Write, Bash(git *), Bash(npx branchos *), WebSearch, WebFetch, AskUserQuestion
---
```

### COMMANDS Record Registration Pattern
```typescript
// Source: src/commands/index.ts
import research from '../../commands/branchos:research.md';

export const COMMANDS: Record<string, string> = {
  // ... existing 14 entries ...
  'branchos:research.md': research,
};
```

### Writing Research Artifact (Phase 11 API)
```typescript
// Source: src/research/research-file.ts
import { writeResearchFile, nextResearchId, researchFilename } from './research-file.js';
import { readIndex } from './research-index.js';
import type { ResearchArtifact } from './types.js';

// Get next ID
const index = await readIndex(researchDir);
const existingIds = index.map(e => e.id);
const id = nextResearchId(existingIds);

// Create artifact
const artifact: ResearchArtifact = {
  id,
  topic: 'Auth Patterns',
  status: 'complete',
  date: '2026-03-11',
  features: ['F-001'],
  body: '## Summary\n\n3-5 bullet point summary.\n\n## Findings\n\nDetailed findings...',
  filename: researchFilename(id, 'Auth Patterns'),
};

// Write (auto-rebuilds index)
await writeResearchFile(researchDir, artifact);
```

### Dynamic Context Injection Pattern
```markdown
# Source: Claude Code docs - !`command` syntax
## Codebase Context
- Architecture: !`cat .branchos/shared/codebase/ARCHITECTURE.md 2>/dev/null || echo "No codebase map found."`
- Research index: !`cat .branchos/shared/research/index.json 2>/dev/null || echo "[]"`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/*.md` only | Skills (`.claude/skills/*/SKILL.md`) unified with commands | 2026 | Commands still work; skills add supporting files, auto-invocation. BranchOS uses commands for consistency. |
| No `AskUserQuestion` in allowed-tools | AskUserQuestion auto-allowed when listed | Recent 2026 fix | Must include explicitly for smooth interactive flow |
| No `!`backtick`` injection | Dynamic context injection via `!`shell command`` | 2025-2026 | Can pre-load codebase context into the command prompt |

**Deprecated/outdated:**
- None relevant. The `.claude/commands/` approach remains fully supported and is the existing BranchOS pattern.

## Open Questions

1. **How to handle `--save` in a multi-turn conversation?**
   - What we know: `$ARGUMENTS` is set once when the command is invoked. If the user invokes `/branchos:research auth patterns`, `$ARGUMENTS` = "auth patterns". To save, they must invoke `/branchos:research --save` as a separate command invocation.
   - What's unclear: Whether the save should compile findings from the current conversation or if the user should be instructed to copy/paste key findings.
   - Recommendation: The save flow should instruct Claude to ask the user to summarize key findings or to review Claude's compiled summary before persisting. The command instructions should guide Claude to compile what was discussed in the conversation.

2. **Should the command use `!`backtick`` for pre-loading context?**
   - What we know: The `!`command`` syntax injects shell output at command load time. This could pre-load ARCHITECTURE.md and the research index.
   - What's unclear: Whether the codebase map might be too large for injection, eating into context window.
   - Recommendation: Use `!`backtick`` injection for the research index (small JSON) and a brief codebase overview. Instruct Claude to read full files on demand rather than injecting everything upfront.

3. **How does `--list` and `--view` relate to this phase?**
   - What we know: SRES-02 (research listing/browsing) is explicitly deferred to "Future Requirements" in REQUIREMENTS.md.
   - What's unclear: Whether basic `--list` should be included for usability even though it is deferred.
   - Recommendation: Do NOT implement `--list` or `--view`. They are explicitly deferred (SRES-01, SRES-02). The command should only handle research sessions and `--save`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^3.0.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/commands/index.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Command file exists with AskUserQuestion in allowed-tools | unit | `npx vitest run tests/commands/index.test.ts -x` | Needs update |
| INT-01 | Command file contains structured option presentation instructions | unit | `npx vitest run tests/commands/research-command.test.ts -x` | Wave 0 |
| INT-02 | Command file includes freeform "Other" option instructions | unit | `npx vitest run tests/commands/research-command.test.ts -x` | Wave 0 |
| INT-03 | Command file contains adaptive questioning instructions (not rigid) | unit | `npx vitest run tests/commands/research-command.test.ts -x` | Wave 0 |
| INT-01 | COMMANDS record has 15 entries including research | unit | `npx vitest run tests/commands/index.test.ts -x` | Needs update |
| INT-01 | install-commands installs 15 files | unit | `npx vitest run tests/cli/install-commands.test.ts -x` | Needs update |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/commands/ tests/cli/install-commands.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/commands/research-command.test.ts` -- validates command file content (AskUserQuestion in allowed-tools, structured options, freeform Other, adaptive instructions, --save handling, Summary section mandate)
- [ ] Update `tests/commands/index.test.ts` -- EXPECTED_FILES array needs `branchos:research.md`, count from 14 to 15
- [ ] Update `tests/cli/install-commands.test.ts` -- count expectations from 14 to 15

## Sources

### Primary (HIGH confidence)
- Claude Code official docs: [Skills documentation](https://code.claude.com/docs/en/skills) - frontmatter reference, allowed-tools, AskUserQuestion, `!`backtick`` injection, context:fork behavior
- Claude Code official docs: [Slash commands](https://code.claude.com/docs/en/slash-commands) - command format, $ARGUMENTS
- Existing codebase: `src/commands/index.ts`, `src/cli/install-commands.ts` - COMMANDS registration pattern
- Existing codebase: `src/research/` - Phase 11 research storage API

### Secondary (MEDIUM confidence)
- Claude API docs: [Handle approvals and user input](https://platform.claude.com/docs/en/agent-sdk/user-input) - AskUserQuestion tool behavior

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing project patterns and Claude Code built-in capabilities
- Architecture: HIGH - the bookend pattern and COMMANDS registration are well-established in this codebase
- Pitfalls: HIGH - derived from actual codebase analysis (14-to-15 count, allowed-tools requirement, Summary section format)

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable -- slash command format is well-established)
