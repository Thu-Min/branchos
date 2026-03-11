# Feature Landscape: Interactive Research Slash Commands

**Domain:** Conversational research workflows for AI-assisted development tools
**Researched:** 2026-03-11
**Confidence:** MEDIUM-HIGH
**Scope:** NEW v2.1 features only. All v2.0 features (PR-FAQ, roadmap, features, sync, workstreams) are shipped.

## Table Stakes

Features developers expect from a research command integrated into an existing planning workflow. Missing these means the research step feels bolted-on rather than native.

| Feature | Why Expected | Complexity | Depends On (existing) |
|---------|--------------|------------|----------------------|
| Research slash command (`/branchos:research`) | Every comparable system (GSD, RIPER, Research-Plan-Implement) provides a research entry point. Without a dedicated command, developers default to unstructured chat, losing artifacts. | LOW | Slash command infrastructure (exists) |
| Persistent research artifacts | GSD writes RESEARCH.md. RIPER stores in memory-bank. Research-Plan-Implement saves to `thoughts/shared/research/`. Developers expect research findings to survive the session and be referenceable later. Ephemeral research is useless for team coordination. | MEDIUM | `.branchos/shared/` storage layer (exists) |
| Research context in downstream commands | RIPER and GSD both feed research findings into planning phases. If `/branchos:discuss-phase` and `/branchos:plan-phase` cannot see prior research, developers will re-explain findings manually -- defeating the purpose. | MEDIUM | Context packet assembly (exists), discuss-phase/plan-phase commands (exist) |
| Structured output format | All prior art produces structured sections (libraries found, patterns to follow, pitfalls to avoid, stack recommendations). Unstructured prose is hard to scan and hard for AI to consume downstream. | LOW | None |
| Multi-topic research within a project | Projects need research on different domains (e.g., "auth libraries" and "real-time sync patterns"). A single monolithic research artifact per project is insufficient. Developers expect to create multiple research documents scoped to topics. | LOW | None |

## Differentiators

Features that set BranchOS research apart from GSD, RIPER, and ad-hoc approaches.

| Feature | Value Proposition | Complexity | Depends On (existing) |
|---------|-------------------|------------|----------------------|
| Conversational research flow | GSD's research phase is a single-shot agent spawn -- user triggers it, agent runs, produces artifact. RIPER is also single-pass. BranchOS can offer a conversational back-and-forth where the developer guides the research direction interactively within the slash command session. Claude Code's interactive mode already supports multi-turn conversation; the slash command provides structured guidance without constraining the interaction. | LOW | Claude Code interactive mode (exists natively) |
| Research linked to features | No prior art connects research artifacts to specific features in a registry. BranchOS can link research to a feature ID (`--feature F-003`), so when a workstream is created for that feature, its research is automatically included in context packets. This closes the gap between "we researched this" and "the developer implementing it has the research." | MEDIUM | Feature registry (exists), feature-aware workstreams (exist) |
| Research linked to milestones | Similar to feature linking, but at milestone scope. A single research document can inform all features in a milestone. Useful for cross-cutting concerns like "what auth library for all M2 features." | LOW | ROADMAP.md milestone structure (exists) |
| Codebase-aware research | BranchOS already has a codebase map (ARCHITECTURE.md, MODULES.md, CONVENTIONS.md, STACK.md). Research can reference the existing stack and conventions, producing recommendations that are contextual rather than generic. No competitor does this -- GSD and RIPER research in a vacuum. | MEDIUM | Codebase map (exists) |
| Research staleness detection | Like BranchOS's codebase map staleness detection (commit-based), research artifacts can track when they were created relative to the codebase. If significant changes have occurred since research was done, flag it as potentially stale. | LOW | Staleness detection pattern (exists in map-status) |
| Team-visible research (git-committed) | Research artifacts committed to git mean the whole team sees domain research, not just the developer who ran the command. PR-reviewable research -- team can challenge assumptions before planning begins. Consistent with BranchOS's "all artifacts in git" principle. | LOW | Git commit pattern (exists in all commands) |

## Anti-Features

Features that seem natural but should be explicitly avoided.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Autonomous web research agent | "Let the AI search the web and compile findings automatically" | Claude Code slash commands run in the user's terminal session. Web search requires tool access (WebSearch, WebFetch) which may not be available or permitted. Autonomous research without user guidance produces generic, low-quality findings. The developer should guide the research direction. | Conversational flow where the developer asks questions and Claude investigates using available tools. Developer steers; AI assists. |
| Research database / search index | "Let me search across all past research with full-text search" | Overengineered for the use case. Research artifacts are markdown files -- `grep` works. Adding a search index adds complexity without proportional value for 2-5 developer teams. | Simple file listing with topic-based naming. Grep for content search. |
| Auto-trigger research before planning | "Automatically run research when a discuss-phase starts" | Removes developer agency. Not all features need research (standard CRUD, well-known patterns). Forced research wastes time and clutters artifacts. GSD explicitly notes research should be skipped for "standard web development, well-documented patterns, simple integrations." | Optional `--research` flag on discuss-phase, or explicit `/branchos:research` before discuss. Developer decides. |
| Research templates per domain | "Have different research templates for frontend, backend, infra, etc." | Template proliferation. Maintaining multiple templates adds burden without clear benefit. A single flexible structure covers most needs. | One research output format with optional sections. Sections that don't apply are simply omitted. |
| Parallel sub-agent research spawning | "Spawn multiple research agents like GSD does" | GSD spawns sub-agents because it operates in a full orchestration context. BranchOS slash commands run in a single Claude Code session. Sub-agent spawning requires the Claude Code Task tool or similar, adding architectural complexity. Single-session research is simpler and keeps the developer in the loop. | Single-session conversational research. Developer can run `/branchos:research` multiple times for different topics. |
| Research approval workflow | "Research should be reviewed and approved before planning" | Adds process overhead. Research is informational, not prescriptive. The review gate is at the plan stage (plan-phase artifacts are committed to git and PR-reviewed). Research is the developer's domain exploration -- requiring approval slows exploration. | Git-committed artifacts are visible to the team. If research seems off, team discusses during plan review. |

## Feature Dependencies

```
                    (existing) Codebase Map
                         |
                         v
/branchos:research  ----uses----> Codebase context for grounded research
       |
       |--produces--> Research artifacts in .branchos/shared/research/
       |
       |--optional--> --feature F-NNN link
       |                    |
       |--optional--> --milestone M1 link
       |
       v
Research in context packets
       |
       |--feeds--> /branchos:discuss-phase (research context available)
       |--feeds--> /branchos:plan-phase (research context available)
       |--feeds--> /branchos:context (research included when relevant)
```

### Dependency Notes

- **Research command has no hard dependencies on new features.** It uses existing infrastructure: slash command system, `.branchos/shared/` storage, git commit patterns, and optionally the codebase map.
- **Context packet integration depends on research artifacts existing.** The `assembleContext` function needs to be extended to include research, but this is additive (not breaking).
- **Feature/milestone linking is optional.** Research works standalone (general project research) or linked to specific features/milestones. Linking enhances context assembly but is not required.
- **Staleness detection reuses existing pattern.** The `map-status` command already tracks commit-based staleness. Same approach applies to research artifacts.

## MVP Recommendation

### Must Build (v2.1 Core)

1. **`/branchos:research` slash command** -- Entry point for interactive research. Accepts topic as argument. Conversational flow: developer describes what they want to research, Claude investigates using codebase context and available tools, produces structured findings. Auto-commits artifact.

2. **Research artifact storage** -- Files in `.branchos/shared/research/<topic-slug>.md` with YAML frontmatter (topic, date, linked feature/milestone, commit hash). Body has structured sections: findings, recommendations, pitfalls, sources.

3. **Research in context packets** -- Extend `assembleContext` to include relevant research when a workstream has a linked feature that has linked research, or when research matches the current milestone.

4. **Research listing command** -- `/branchos:research list` or integrate into `/branchos:status` to show existing research artifacts with their topics and dates.

### Defer (v2.2+)

- **Research staleness detection** -- Nice to have but not critical for launch. Research is less volatile than codebase maps.
- **Research diffing on update** -- Showing what changed when research is re-run. Add after validating the basic flow works.
- **Bulk research import** -- Importing external research documents (ADRs, tech spike writeups). Users can manually place files for now.

## Feature Specification Details

### `/branchos:research` Command Behavior

**Invocation patterns:**
```
/branchos:research                     # Start research, prompted for topic
/branchos:research auth libraries      # Research with topic from args
/branchos:research --feature F-003     # Research linked to feature F-003
/branchos:research --milestone M2      # Research linked to milestone M2
/branchos:research list                # List existing research artifacts
```

**Conversational flow:**
1. Developer invokes with topic (or is prompted for one)
2. Command loads codebase context (ARCHITECTURE.md, STACK.md, CONVENTIONS.md) for grounding
3. If `--feature` provided, loads feature description and acceptance criteria for scoping
4. Claude and developer have a back-and-forth conversation exploring the domain
5. When developer indicates they're satisfied (or explicitly says "done"), Claude produces the structured research artifact
6. Artifact is written and auto-committed

**This is NOT a single-shot agent.** The developer guides the research direction. Claude asks clarifying questions. The developer can redirect ("actually, focus more on X"). This conversational quality is the primary differentiator from GSD/RIPER.

### Research Artifact Format

```markdown
---
topic: <topic-slug>
title: <Human-readable title>
createdAt: <ISO 8601>
updatedAt: <ISO 8601>
commitHash: <git HEAD at creation>
feature: <F-NNN or null>
milestone: <M1 or null>
---

# Research: <Title>

## Context

<What was being investigated and why>

## Findings

<Structured findings organized by sub-topic>

## Recommendations

<What to use, what to avoid, with rationale>

## Pitfalls

<Known problems, gotchas, things that commonly go wrong>

## Open Questions

<Unresolved questions that need further investigation>

## Sources

<Links to documentation, articles, repos consulted>
```

### Context Packet Integration

Extend `AssemblyInput` (existing pure function) with:
- `research?: { topic: string; content: string }[]` -- Array of relevant research documents
- Research is included when:
  - Workstream is linked to a feature that has linked research
  - Workstream is working on a milestone that has linked research
  - Research is explicitly referenced (future: `--research <topic>` on context command)

### Research Listing

Add research summary to `/branchos:status` output:

```
Research:
  auth-libraries (M2, F-003) -- 2026-03-11, 3 commits behind
  websocket-patterns (M2) -- 2026-03-10, current
```

Or standalone: `/branchos:research list` outputs a table of topics, links, dates.

## Complexity Assessment

| Feature | Estimated Effort | Risk | Notes |
|---------|-----------------|------|-------|
| Research slash command | LOW (1 session) | LOW | Follows established slash command pattern. Markdown template + conversational instructions. |
| Research artifact storage | LOW (1 session) | LOW | YAML frontmatter + markdown body. Existing pattern from feature files. |
| Context packet integration | MEDIUM (1-2 sessions) | LOW | Extends existing `assembleContext` pure function. Needs tests for research inclusion logic. |
| Research listing | LOW (1 session) | LOW | Read directory, parse frontmatter, format output. |
| Feature/milestone linking | LOW (1 session) | LOW | Optional frontmatter fields, lookup logic in context assembly. |
| **Total** | **MEDIUM (4-6 sessions)** | **LOW** | Builds entirely on existing patterns. No new architectural concepts. |

## Prior Art Analysis

| System | Research Approach | Artifact | User Interaction | Strength | Weakness |
|--------|-------------------|----------|------------------|----------|----------|
| GSD | Single-shot sub-agent spawn. Agent researches autonomously, writes RESEARCH.md. | RESEARCH.md per phase | Trigger and wait | Parallel agents, thorough | No user guidance during research. Generic results for unfamiliar domains. |
| RIPER | Research phase is read-only exploration. Claude reads codebase, produces understanding document. | Memory bank files | Sequential phase gate | Prevents premature coding | Focused on codebase understanding, not domain/ecosystem research |
| Research-Plan-Implement | Parallel agents investigate codebase aspects. Saves to `thoughts/shared/research/`. | Research files in shared directory | Command-driven, multi-agent | Persistent across sessions | Codebase-focused, not domain-focused |
| Kiro | Spec-driven: requirements (EARS notation) then design then tasks. No explicit research phase. | Spec files | Conversational spec refinement | Structured output | No research step -- assumes domain knowledge exists |
| BranchOS v2.1 (proposed) | Conversational, developer-guided. Codebase-aware. Feature/milestone-linked. Git-committed. | Research files in `.branchos/shared/research/` | Interactive back-and-forth | Contextual, guided, team-visible | Single-session (no parallel agents) |

### Key Insight from Prior Art

Every system that includes research treats it as a **pre-planning gate** -- research happens before discuss/plan, not during. BranchOS should follow this pattern: `/branchos:research` runs before `/branchos:discuss-phase`, and research artifacts flow into discuss and plan context packets.

However, research should be **optional**, not mandatory. GSD explicitly notes to skip research for "standard web development, well-documented patterns, simple integrations." BranchOS should not force a research step.

## Sources

- [GSD (Get Shit Done) for Claude Code](https://github.com/gsd-build/get-shit-done) -- Research phase implementation with parallel sub-agents. `/gsd:research-phase` command as prior art. (HIGH confidence)
- [GSD Research Phase Details](https://www.claudepluginhub.com/commands/glittercowboy-get-shit-done/commands/gsd/research-phase) -- GSD research command workflow, artifact format, skip criteria (HIGH confidence)
- [RIPER-5 for Claude Code](https://github.com/tony/claude-code-riper-5) -- Research-Innovate-Plan-Execute-Review workflow with read-only research phase (HIGH confidence)
- [Research-Plan-Implement Framework](https://github.com/brilliantconsultingdev/claude-research-plan-implement) -- Parallel research agents, persistent findings storage (MEDIUM confidence)
- [Kiro Spec-Driven Development](https://kiro.dev/) -- Requirements-Design-Tasks workflow without explicit research phase (MEDIUM confidence)
- [Claude Code Slash Commands Docs](https://code.claude.com/docs/en/slash-commands) -- Custom command specification, `$ARGUMENTS` support, `allowed-tools` (HIGH confidence)
- [Claude Code Interactive Mode](https://code.claude.com/docs/en/interactive-mode) -- Multi-turn conversation support in Claude Code sessions (HIGH confidence)
- [GSD Workflow Deep Dive](https://www.codecentric.de/en/knowledge-hub/blog/the-anatomy-of-claude-code-workflows-turning-slash-commands-into-an-ai-development-system) -- Analysis of slash command orchestration patterns (MEDIUM confidence)
- [Artifacts in AI-Assisted Programming](https://humanwhocodes.com/blog/2026/02/artifacts-ai-assisted-programming/) -- Role of persistent artifacts in AI-assisted development workflows (MEDIUM confidence)

---
*Feature research for: BranchOS v2.1 Interactive Research*
*Researched: 2026-03-11*
