# Pitfalls Research

**Domain:** Adding interactive research slash commands to an existing CLI-first AI dev tool with slash command architecture
**Project:** BranchOS v2.1 Interactive Research
**Researched:** 2026-03-11
**Confidence:** HIGH (direct codebase analysis, slash command architecture constraints, prior v2.0 pitfalls experience)

## Critical Pitfalls

### Pitfall 1: Context Window Bloat From Accumulated Research Artifacts

**What goes wrong:**
Research is inherently open-ended. Each research iteration produces markdown artifacts (findings, comparisons, summaries). When these accumulate in the context packet, the assembled context grows unbounded. The existing `assembleContext` function already loads architecture, conventions, modules, discuss/plan/execute artifacts, decisions, feature context, and diff summaries (the `AssemblyInput` interface has 14 fields). Adding research artifacts on top pushes the context packet beyond what fits usefully in Claude Code's context window. The LLM starts dropping or ignoring earlier research, or the slash command output becomes so large that Claude Code truncates it.

**Why it happens:**
BranchOS's context model was designed for structured, bounded artifacts (a discuss.md, a plan.md, an execute.md -- each produced once per phase). Research is different: it can produce multiple files per topic, accumulate across sessions, and reference external sources. Developers naturally want "all my research available" when they move to planning, but assembling everything creates an unmanageable context payload.

**How to avoid:**
- Research artifacts must have a **summary layer**. Store raw research in detail files but only inject a condensed `research-summary.md` into the context packet. Maximum 200-300 lines in the summary.
- Implement a research-to-context pipeline: raw findings -> distilled summary -> context packet inclusion. The summary is what gets assembled by `assembleContext`, not the raw research.
- Set a hard size budget for research context (e.g., 4000 tokens worth). Truncate with a "See full research in .branchos/..." pointer.
- Never auto-include all research files in the context packet. Include only the summary for the current feature/workstream.

**Warning signs:**
- Context packet output exceeds 500 lines total
- Users run `/branchos:context` and get a wall of text they scroll past
- Research from unrelated topics leaks into workstream context
- Claude Code responses start ignoring or contradicting earlier research findings

**Phase to address:**
Phase 1 (research storage design). The storage schema must separate raw research from summarized research from the start. Retrofitting a summary layer onto flat research files is painful.

---

### Pitfall 2: Over-Engineering the Research Workflow Into a Multi-Step State Machine

**What goes wrong:**
The existing workstream model has a clean three-step lifecycle: discuss -> plan -> execute, tracked via `PhaseStep` with status fields. It is tempting to model research as its own multi-step state machine (e.g., "question -> investigate -> synthesize -> validate -> finalize") with status tracking, transitions, and guards. This creates a rigid workflow that fights against research's inherently iterative, non-linear nature. Developers abandon the structured flow and just write files manually, making the state machine dead code.

**Why it happens:**
BranchOS has a successful pattern (`PhaseStep` with `'not-started' | 'in-progress' | 'complete'` tracking) and the natural instinct is to replicate it. But research does not follow a linear pipeline. A developer might research, discover a new question, pivot, research again, merge findings, and backtrack. Forcing this into a state machine creates friction without value.

**How to avoid:**
- Research should be **artifact-driven, not state-driven**. Track what files exist and when they were last updated, not what "step" the researcher is on.
- Use a simple status model: `active` / `complete` / `stale`. No intermediate steps. No transition guards.
- The slash command should be re-entrant: running `/branchos:research` again picks up where you left off based on existing artifacts, not based on a state field.
- Let the content of research files (presence of summary, presence of findings) imply progress, not a deeply nested status object in state.json.

**Warning signs:**
- state.json gets a deeply nested research status object with multiple sub-steps
- You are writing transition validation code ("can't synthesize before investigating")
- The research command has more than 2-3 "modes" or sub-steps
- Users complain they cannot go back to add more research after "completing" a step

**Phase to address:**
Phase 1 (core design). This is an architectural decision that pervades everything. Get it wrong and every subsequent phase fights it.

---

### Pitfall 3: Research Scope Creep -- Trying to Be a General-Purpose Research Tool

**What goes wrong:**
The feature starts as "research before planning" but grows to include: web search integration, automated source fetching, citation management, knowledge base building, cross-project research sharing, research templates for different domains, and AI-powered synthesis. Each addition is individually reasonable but collectively they transform BranchOS from a workflow tool into a research platform. Development stalls, the feature never ships, and the simple use case (developer asks questions, gets answers, records findings for planning) gets buried under complexity.

**Why it happens:**
Research is an unbounded problem domain. Every person who touches the feature sees a different "essential" capability. The lack of a clear scope boundary means each review cycle adds requirements. Also, because the research is conversational (user talks to Claude), it feels natural to keep expanding what the conversation can do.

**How to avoid:**
- Define research as: **structured conversation that produces planning-ready artifacts**. Nothing more.
- The slash command's job is to (1) load existing context and research artifacts, (2) frame the research question, (3) let the developer converse with Claude, and (4) record the output. BranchOS does not DO the research -- Claude does. BranchOS captures and organizes the results.
- Hard "out of scope" list: no custom web search integration (Claude Code already has WebSearch/WebFetch tools), no citation management, no cross-project research, no domain-specific research templates.
- Ship the minimal version first: a command that creates/loads a research session and writes findings to a structured file. Iterate from real usage, not imagination.

**Warning signs:**
- The research slash command markdown file exceeds 150 lines
- You are building custom tool integrations inside the slash command
- Feature discussions keep saying "we could also..."
- The research file schema has more than 5-6 fields

**Phase to address:**
Phase 0 (requirements/scoping). Write explicit scope boundaries before any code. This is a project constraint, not a phase deliverable.

---

### Pitfall 4: Breaking the Existing discuss -> plan -> execute Flow

**What goes wrong:**
Research gets wedged into the existing workflow in a way that creates confusion about ordering and purpose. Does research happen before discuss? During discuss? Is it a separate pre-phase? Developers do not know when to use `/branchos:research` vs `/branchos:discuss-phase`. The two commands overlap in purpose (both involve "talking about what to build"), creating a redundant workflow where developers skip one or use them inconsistently.

**Why it happens:**
Research and discussion are conceptually adjacent. Both involve exploring a problem space. The existing discuss-phase already produces goals, requirements, assumptions, unknowns, and decisions. Research produces findings, recommendations, and constraints. Without a clear boundary, they blur together.

**How to avoid:**
- **Research is project-level or feature-level, not workstream-phase-level.** This is the key architectural distinction. Research lives in `.branchos/shared/research/` (or per-feature), not in workstream phase directories. It happens BEFORE a workstream exists, or early in the workstream to inform discussion.
- Discuss-phase consumes research output. Research produces findings; discuss-phase makes decisions informed by those findings. Clear pipeline: research -> discuss (informed by research) -> plan -> execute.
- Make the relationship explicit in the slash command: `/branchos:discuss-phase` should check for and reference existing research artifacts, surfacing them as input context.
- Do NOT add a `research: PhaseStep` field to the `Phase` interface in state.ts. Research is not a phase step.

**Warning signs:**
- Someone proposes adding `research: PhaseStep` to the Phase interface
- Users ask "should I research or discuss first?"
- Research artifacts end up in `.branchos/workstreams/<id>/phases/<n>/research.md`
- The discuss slash command and research slash command produce overlapping output formats

**Phase to address:**
Phase 1 (storage design) and Phase 2 (slash command design). The storage location and the command's framing both need to reinforce that research is a separate concern from workstream phases.

---

### Pitfall 5: Conversational State Persistence Across Slash Command Invocations

**What goes wrong:**
Slash commands in Claude Code are stateless between invocations. Each time a user runs `/branchos:research`, Claude Code processes the command markdown and $ARGUMENTS fresh. The research "session" -- the back-and-forth dialogue where the developer asks questions and Claude responds -- cannot be persisted by BranchOS because BranchOS only controls what gets written to files, not Claude Code's conversation memory. Developers expect to "resume" a research conversation, but the slash command can only reload artifact files, not the conversational context that produced them.

**Why it happens:**
Interactive research implies multi-turn conversation. But slash commands are structured prompts that execute within the current conversation. If a developer starts a new conversation and runs `/branchos:research` again, all prior conversational context is gone. BranchOS can assemble file-based context, but it cannot control Claude Code's conversation history.

**How to avoid:**
- Design for **artifact-based continuity, not conversation continuity**. Each research invocation reads existing research files and uses them as context. The "conversation" is reconstructed from artifacts, not from chat history.
- Structure research artifacts to be self-contained: each finding should include the question asked, the answer found, the confidence level, and the sources. This means a new Claude session can read the artifact and understand what was already explored.
- Include a "Research Log" section in the research file that acts as a structured transcript -- not a literal chat log, but a question -> finding sequence that lets Claude pick up context.
- Do NOT try to build conversation persistence. It is outside BranchOS's control and would require hacking Claude Code internals.

**Warning signs:**
- Developers complain that Claude "forgot" what they researched last session
- Research artifacts are written as conclusions without the questions that led to them
- Someone proposes storing Claude conversation IDs or message histories
- Research output is only useful in the session it was created (not readable standalone)

**Phase to address:**
Phase 2 (slash command design). The command's prompt template must explicitly instruct Claude to read existing artifacts and build on them, creating continuity through artifact quality rather than conversation memory.

---

### Pitfall 6: Research Artifact Bloat in Git History

**What goes wrong:**
BranchOS commits all artifacts to git (a key design decision from v1). Research, being iterative, produces many revisions. A developer might update research findings 10-15 times during a session. If each update triggers an auto-commit (following the established pattern from discuss/plan/execute commands which auto-commit in Step 8), the git history fills with noisy "chore(branchos): update research" commits that obscure meaningful changes. Worse, large research files with embedded source quotes or analysis can bloat the repository.

**Why it happens:**
The existing auto-commit pattern works for discuss/plan/execute because those produce one artifact per invocation. Research is different -- it is iterative within a single conceptual session, with the file being updated as findings accumulate. Applying the same auto-commit-on-every-write pattern creates commit spam.

**How to avoid:**
- Auto-commit research artifacts only at **session boundaries**, not on every write. The research slash command should write files during the session but only commit when the user explicitly signals "done for now" or when the research command reaches its final step.
- Commit on explicit save points: "save research progress" as a user action within the command, not automatic on every file update.
- Keep research files concise. Structured markdown (tables, bullet points) instead of prose. Set a soft guideline of 200 lines max per research file.
- Use a `.branchos/shared/research/` directory with per-topic files rather than one monolithic research dump.

**Warning signs:**
- `git log --oneline` shows 10+ consecutive "update research" commits
- `.branchos/` directory size grows noticeably after research sessions
- Team members complain about noisy git history from research commits
- Research files exceed 500 lines

**Phase to address:**
Phase 2 (slash command implementation). The commit strategy should be designed into the command flow from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing research in workstream dir instead of shared | Simpler path resolution, no new storage location needed | Research locked to one workstream, cannot share across features or reuse when workstream is archived | Never -- research should be reusable across workstreams |
| No size limits on research artifacts | Users write freely without constraints | Context assembly becomes unwieldy, context packet exceeds useful size | MVP only -- add limits before second iteration |
| Hardcoding research file structure in slash command markdown only | Ships faster, no TypeScript code changes needed | Cannot validate structure programmatically, cannot extract summaries for context assembly, cannot detect staleness | First iteration only, must add TypeScript support for context integration |
| Skipping research-to-context integration | Research command works standalone without touching assembleContext | Discuss/plan phases do not benefit from research, defeating the entire purpose of integrated research | Never -- integration is the whole point of this milestone |
| Single flat research file per topic | Simple file management, easy to understand | Cannot track multiple research sessions, no separation of raw findings from summary | Acceptable for v2.1 MVP if summary section is embedded in the file |
| No research indexing/manifest | Fewer files to manage, simpler commands | Cannot list research topics without scanning directory, cannot associate research with features | Acceptable for MVP if research count stays under 10 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Context assembly (`assembleContext` in `src/context/assemble.ts`) | Adding research as another full-text section alongside architecture/conventions/modules | Add a dedicated `researchSummary` field to `AssemblyInput` with a size budget; only include the summary section, not raw findings |
| Existing discuss-phase slash command | Not referencing research artifacts when they exist | Update `commands/branchos:discuss-phase.md` to check for and load relevant research as input context in Step 3 (Gather context) |
| State model (`WorkstreamState` in `src/state/state.ts`) | Adding complex research state to WorkstreamState with new PhaseStep-like fields | Research state is separate -- either in shared state or as file-presence detection. Do not extend WorkstreamState or Phase with research fields |
| Feature registry | No link between features and research topics | Research files should be nameable by feature ID (e.g., `research-F001.md`) so feature-aware context assembly can include relevant research |
| Auto-commit pattern (Step 8 in slash commands) | Committing on every research file write, same as discuss/plan/execute | Commit at session end or on explicit user action only -- research is iterative, not one-shot |
| Slash command `allowed-tools` | Restricting tools too tightly for research (e.g., only `Bash(npx branchos *)`) | Research needs Read, Write, Glob, Grep, Bash(git), Bash(npx branchos), and potentially WebSearch/WebFetch for Claude to actually perform research |
| Slash command `$ARGUMENTS` | Not passing the research topic through $ARGUMENTS | Research command must use $ARGUMENTS as the topic/question, similar to how discuss-phase uses it as guidance |
| `ensureWorkstream` gate | Requiring a workstream to exist before research can run | Research should work without a workstream -- it is project/feature-level, not workstream-level |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all research files into context packet | Slow context assembly, huge output, Claude ignores early content | Only load summary file or summary section, not all raw research | More than 3-4 research files per project |
| Glob-scanning `.branchos/shared/research/` on every command invocation | Noticeable delay on slash command start | Read only the specific research file for the current feature, or maintain a lightweight index | More than 20 research files (unlikely near-term but possible) |
| Large research artifacts inflating git diff in `branchos status` | Status command slows down, diff output becomes unreadable | Keep research files under 200 lines; use structured format not prose | Cumulative research across all topics exceeds 50 files |
| Research file reads during `assembleContext` when no research exists | Unnecessary filesystem calls for projects not using research | Guard with existence check before reading; lazy-load only when research directory exists | Any project not using v2.1 research features |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Research artifacts containing API keys or credentials discovered during investigation | Keys committed to git in `.branchos/shared/research/` visible to all repo collaborators | Research file template should include a "do not include secrets" reminder; slash command prompt should instruct Claude to redact sensitive values |
| Research slash command with overly broad `allowed-tools` (e.g., `Bash(*)`) | Arbitrary command execution during research session | Scope `allowed-tools` to read-only operations plus git and branchos commands; use pattern `Bash(git *)`, `Bash(npx branchos *)` |
| External URL content embedded verbatim in research files | Copyright issues, potential injection of malicious content, large binary payloads | Store URLs and summaries in research files, not full page content; Claude naturally summarizes but the prompt should reinforce this |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Research command requires choosing a "research type" or "mode" before starting | Friction at the moment of curiosity; developer just wants to ask a question | Single entry point: `/branchos:research <topic>`. Infer structure from content, not upfront configuration |
| No way to see what has been researched already | Developers re-research topics or lose track of findings | `/branchos:research` with no arguments lists existing research files with one-line summaries |
| Research output is a wall of unstructured text | Hard to scan, hard to reference from discuss/plan phases | Enforce structured output: summary, key findings (bulleted), open questions, confidence levels |
| Must create a workstream before researching | Research often happens BEFORE you know what workstream you need | Allow research at project/feature level without requiring a workstream -- bypass `ensureWorkstream` gate |
| No indication when research is "enough" | Developers either over-research (perfectionism) or under-research (rushing) | Include a "completeness check" in research output: table stakes covered? architecture patterns identified? key risks surfaced? |
| Research and discuss-phase feel redundant | Developer confusion about which command to use, workflow feels heavy | Clear naming and help text. Research = "what exists, what are the options." Discuss = "what are we building, what decisions do we make." |
| Research artifacts not visible to teammates | One developer researches but others don't see findings because they are in a branch | Research in `.branchos/shared/research/` (shared layer) means it is visible on any branch after commit+push |

## "Looks Done But Isn't" Checklist

- [ ] **Research command works:** Often missing integration with discuss-phase -- verify that `/branchos:discuss-phase` actually loads and references research artifacts when they exist
- [ ] **Research files written:** Often missing summary section -- verify that research files have a structured summary block (not just raw findings) that context assembly can extract
- [ ] **Context assembly updated:** Often missing research in context packet -- verify `/branchos:context` includes research summary when research exists for the current feature
- [ ] **Research without workstream:** Often missing project-level research path -- verify `/branchos:research` works when no workstream is active (pre-workstream research on main branch)
- [ ] **Artifact continuity:** Often missing structured question/finding format -- verify that a new Claude session can read research artifacts and continue meaningfully without prior conversation context
- [ ] **Git integration:** Often missing sensible commit strategy -- verify research sessions do not produce 10+ commits per session
- [ ] **Feature linkage:** Often missing feature-to-research association -- verify that feature-linked workstreams surface relevant research in context assembly output
- [ ] **Allowed-tools scope:** Often missing necessary tools for research -- verify the research slash command's `allowed-tools` includes WebSearch, WebFetch, Read, Glob, Grep so Claude can actually investigate

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context bloat from research | LOW | Add summary extraction to `assembleContext`, update to use summary only. Research files themselves don't need to change -- just how they're consumed. |
| Over-engineered state machine | MEDIUM | Simplify state model, remove transition guards, migrate state data. Harder if other commands depend on research state transitions. |
| Scope creep (built too much) | HIGH | Cannot easily un-ship features users depend on. Must maintain or deprecate. Prevention is critical here. |
| Research in wrong storage location (workstream instead of shared) | MEDIUM | Write migration script to move files from workstream dirs to shared. Update path references in all commands. |
| Broken discuss-phase integration | LOW | Update discuss-phase slash command markdown to read research files in Step 3. No TypeScript changes needed. |
| Git history bloat from research commits | LOW (for future) | Cannot rewrite history easily, but can fix commit strategy going forward. Squash research commits on feature branches before merge. |
| Conversation continuity failure | LOW | Improve research file structure to be more self-contained. Update slash command prompt to explicitly instruct "read existing research first." No code changes. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Context window bloat | Phase 1: Research storage design | Context packet with research stays under 500 lines; summary is under 200 lines |
| Over-engineered state machine | Phase 1: Research storage design | Research tracking uses 3 or fewer status values; no transition validation code exists |
| Research scope creep | Phase 0: Requirements/scoping | Written "out of scope" list exists in milestone requirements; reviewed before each phase |
| Breaking discuss/plan/execute flow | Phase 1: Storage design + Phase 2: Command design | Research lives in `.branchos/shared/research/`; discuss-phase references it; no `research: PhaseStep` in Phase interface |
| Conversation persistence gap | Phase 2: Slash command design | New Claude session can continue research from artifacts alone; tested by running command in fresh conversation |
| Git history bloat | Phase 2: Slash command implementation | Research session produces at most 1-2 commits total |
| Research without workstream | Phase 1: Storage design | `/branchos:research` works on main branch with no active workstream |
| Discuss-phase integration | Phase 3: Integration | `/branchos:discuss-phase` reads and surfaces existing research artifacts |

## Sources

- Direct codebase analysis: `src/cli/context.ts` (AssemblyInput with 14 fields, context assembly flow), `src/state/state.ts` (WorkstreamState and Phase interfaces), `commands/branchos:discuss-phase.md` (8-step slash command pattern with auto-commit), `commands/branchos:context.md` (context loading pattern)
- BranchOS PROJECT.md (v2.1 milestone definition, architectural constraints, key decisions)
- Prior v2.0 pitfalls research (2026-03-09) -- established patterns for integration gotchas and state management
- Claude Code slash command architecture constraints: stateless invocations, `allowed-tools` scoping, `$ARGUMENTS` passthrough pattern

---
*Pitfalls research for: BranchOS v2.1 Interactive Research Slash Commands*
*Researched: 2026-03-11*
