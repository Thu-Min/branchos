# Feature Research

**Domain:** CLI-based project planning layer for AI-assisted development workflows
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH

## Feature Landscape

This research focuses exclusively on the NEW v2 features (project-level planning layer). v1 features (workstream isolation, context assembly, conflict detection, etc.) are already shipped and validated.

### Table Stakes (Users Expect These)

Features users assume exist once BranchOS claims "project-level planning." Missing these means the planning layer feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PR-FAQ ingestion from markdown | If BranchOS says "start from PR-FAQ," reading a markdown file is the bare minimum. PO writes PR-FAQ.md, tool reads it. | LOW | Parse markdown, store at `.branchos/shared/PR-FAQ.md`. No generation needed -- PO provides it. Validated by CCPM's similar `/pm:prd-new` approach where specs are user-authored. Store content hash for change detection. |
| Roadmap generation from PR-FAQ | The whole value prop is "PR-FAQ becomes actionable roadmap." Without this, PR-FAQ ingestion is pointless. | HIGH | AI-assisted: Claude reads PR-FAQ, produces milestones/features/dependencies. Output is ROADMAP.md + feature files. This is the hardest feature -- quality of AI output determines product value. |
| Feature files with acceptance criteria | Features without testable criteria are just wishlists. QA/testers need clear pass/fail conditions. | MEDIUM | Markdown files with YAML frontmatter (id, status, milestone, branch, issue). Body has description + acceptance criteria as checklist. Pattern validated by SPECLAN extension and CCPM's task files. |
| Feature status tracking | Users need to see "what's done, what's in progress, what's unstarted" at a glance. | LOW | `status` field in feature frontmatter: `unassigned -> assigned -> in-progress -> complete`. List command shows summary table. |
| Feature-aware workstream creation | If features exist but workstreams ignore them, the planning layer is disconnected from execution. | MEDIUM | `--feature <id>` flag on workstream create. Pre-populates workstream context with feature description, acceptance criteria, branch name. Depends on: feature registry exists. |
| GitHub Issues creation from features | Teams already use GitHub Issues for tracking. BranchOS must push features there, not replace the workflow. | MEDIUM | Shell out to `gh issue create --title --body-file --label --milestone`. One issue per feature. Store issue number back in feature frontmatter. Requires `gh` CLI authenticated. |
| Roadmap refresh on PR-FAQ change | PR-FAQ is a "living document" per vision doc. Roadmap must update when it changes. | HIGH | Explicit command (`/branchos:refresh-roadmap`), not auto-detect. Diff PR-FAQ against last-processed version, AI regenerates affected sections. Must handle: new features added, existing features modified, features removed. Hardest part is preserving manual edits to feature files. |
| Enhanced context assembly | Context packets must include feature context when workstream is linked to a feature. | LOW | Extend `AssemblyInput` with optional feature fields (description, acceptance criteria, issue link). Add `feature` to `STEP_SECTIONS` for discuss/plan steps. Builds on existing pure function pattern -- minimal code change. |

### Differentiators (Competitive Advantage)

Features that set BranchOS apart from CCPM, APM, and generic project management tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PR-FAQ as input (not generated) | CCPM generates PRDs through brainstorming. BranchOS treats the PO's PR-FAQ as source of truth -- respects the product owner's role instead of AI-generating requirements. This is a deliberate design choice, not a limitation. | N/A (design decision) | Reduces AI hallucination risk in requirements. PO owns the "what," AI helps with the "how." |
| Roadmap as reviewable artifact | Generated roadmap is a markdown file committed to git. Team reviews in a PR. Not locked in a SaaS tool or synced immediately. | LOW | Git-committed, PR-reviewable, human-editable. CCPM syncs directly to GitHub Issues -- BranchOS adds a review step before sync. |
| Acceptance criteria for manual testers | Feature files include acceptance criteria that non-developers can verify. QA doesn't need to read code. | LOW | Checklist format in feature files. Testers can check off criteria without IDE or codebase access. Differentiates from developer-only tools like CCPM and APM. |
| Suggested branch names in features | Eliminates bikeshedding. Team consistency without a naming convention doc. | LOW | `branch: feature/auth-system` in feature frontmatter. Workstream creation uses it automatically. Small but high-friction-reduction feature. |
| Milestone-based ordering | Features grouped by milestones with explicit dependencies. Teams complete milestone 1 before starting milestone 2. | MEDIUM | ROADMAP.md has milestone sections. Feature files reference their milestone. Dependency graph prevents out-of-order work. |
| Slash-command-only architecture | All workflow commands via `/branchos:*` in Claude Code. CLI reduced to bootstrapper (`init`, `install`). No context switching between terminal and Claude Code. | MEDIUM | Requires migrating all v1 CLI commands to slash command equivalents. CLI becomes thin: just `branchos init` and `branchos install-commands`. Unique positioning -- no competitor is fully slash-command-native. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-detect PR-FAQ changes | "Roadmap should update automatically when I edit PR-FAQ" | Creates surprise regeneration. May overwrite manual feature edits. Hard to diff reliably. Team may not be ready for roadmap changes. | Explicit `/branchos:refresh-roadmap` command. User controls when regeneration happens. |
| PR-FAQ generation/brainstorming | "Help me write the PR-FAQ from scratch" | BranchOS is not a product management tool. Generating requirements with AI loses the "working backwards" discipline. PO should write PR-FAQ with their own judgment. | Accept PR-FAQ as input only. Could offer `/branchos:review-roadmap` to critique (not generate) the PR-FAQ, but defer this. |
| Assignment system | "Let me assign features to developers in BranchOS" | GitHub already has assignment, labels, boards, discussions, notifications. Rebuilding this is pure waste. | Push features to GitHub Issues. Assignment happens on GitHub. Self-assign by creating workstream with `--feature`. |
| Real-time sync with GitHub | "Issues should always be in sync" | Polling GitHub API continuously is fragile, rate-limited, and unnecessary for a CLI tool. Creates complex state reconciliation. | Explicit `sync-issues` command. Run when you want to push/pull. Idempotent. |
| Multi-repo roadmaps | "Our project spans multiple repos" | Massively increases complexity. Cross-repo state coordination is a distributed systems problem. | Single-repo focus. If multi-repo needed, each repo has its own BranchOS instance. Coordinate at the GitHub project board level. |
| Web dashboard | "I want to see the roadmap in a browser" | BranchOS is terminal-first. Building a web UI changes the product entirely. | Use GitHub's project boards for visual tracking. Feature files are markdown -- readable anywhere. |
| Auto-create workstreams from features | "When a feature is assigned, automatically create the workstream" | Removes developer agency. Developer should choose when to start, on which branch, with what context. | Feature-aware workstream creation with `--feature` flag. Developer initiates deliberately. |
| Gantt charts / timeline views | "Show me a timeline of milestones" | CLI tools render poorly as charts. Adds heavy dependency for marginal value. | Milestones have order, not dates. Use GitHub milestones with due dates if calendar tracking is needed. |
| Bidirectional issue sync | "Pull issue status from GitHub back to features" | Adds polling, state reconciliation, conflict resolution. High complexity for marginal value in v2.0. | Defer to v2.1+. Feature status is tracked locally. GitHub issue status is tracked on GitHub. They don't need to be identical. |

## Feature Dependencies

```
PR-FAQ Ingestion
    |
    v
Roadmap Generation ----requires----> PR-FAQ Ingestion
    |
    v
Feature Registry ---requires----> Roadmap Generation
    |            \
    |             \
    v              v
GitHub Issues     Feature-Aware Workstream Creation
Sync                  |
                      v
                 Enhanced Context Assembly

Roadmap Refresh ---requires----> PR-FAQ Ingestion + Roadmap Generation + Feature Registry

Slash Command Migration ---independent--- (can happen in parallel with any of above)
```

### Dependency Notes

- **Roadmap Generation requires PR-FAQ Ingestion:** Cannot generate a roadmap without a PR-FAQ to read. PR-FAQ is the sole input.
- **Feature Registry requires Roadmap Generation:** Feature files are an output of roadmap generation. Could theoretically be created manually, but the workflow assumes AI generates them from the roadmap.
- **GitHub Issues Sync requires Feature Registry:** Issues are created from feature files. No features = nothing to sync.
- **Feature-Aware Workstream Creation requires Feature Registry:** The `--feature` flag looks up feature files for context pre-loading. Feature files must exist.
- **Enhanced Context Assembly requires Feature-Aware Workstreams:** Context packets need to know which feature a workstream is linked to. Requires the `meta.json` enhancement to store feature linkage.
- **Roadmap Refresh requires all three upstream features:** Must read PR-FAQ (detect changes), understand current roadmap, and update feature files without destroying manual edits.
- **Slash Command Migration is independent:** Can happen at any phase. No dependency on planning features. Should be done early to establish the pattern for new commands, since all new v2 commands will be slash-command-only.

## MVP Definition

### Launch With (v2.0)

Minimum viable project planning layer -- enough to go from PR-FAQ to executing features.

- [ ] **PR-FAQ ingestion** -- Read and store PO-provided PR-FAQ.md. Validate basic structure (has headings, has FAQ section). Store hash for change detection later.
- [ ] **Roadmap generation** -- AI-assisted: read PR-FAQ, output ROADMAP.md with milestones and feature list. Output individual feature files with acceptance criteria.
- [ ] **Feature registry** -- Feature files in `.branchos/shared/features/` with YAML frontmatter (id, title, status, milestone, branch, issue). List command shows overview.
- [ ] **Feature-aware workstream creation** -- `--feature <id>` flag that pre-loads feature context into workstream. Sets branch name from feature file.
- [ ] **Enhanced context assembly** -- Include feature description and acceptance criteria in context packets for linked workstreams.
- [ ] **Slash command migration** -- Move all v1 CLI commands to `/branchos:*` slash commands. CLI becomes bootstrapper only (`init`, `install-commands`).

### Add After Validation (v2.x)

Features to add once the core planning workflow is working and teams are using it.

- [ ] **GitHub Issues sync** -- Push features to GitHub Issues with `gh` CLI. Store issue numbers back. Triggered by explicit command. Defer because: teams need to validate the feature registry format first before pushing to GitHub. Also requires `gh` auth, adding a hard dependency.
- [ ] **Roadmap refresh** -- Detect PR-FAQ changes (hash comparison), re-run roadmap generation for changed sections. Defer because: this is the hardest feature and requires solving the "preserve manual edits" problem. Better to ship without it and learn how teams actually modify feature files.

### Future Consideration (v3+)

- [ ] **Bidirectional issue sync** -- Pull issue status from GitHub back to feature files. Defer: depends on GitHub Issues sync working well first, and adds state reconciliation complexity.
- [ ] **Cross-milestone dependency visualization** -- Show which features block other milestones. Defer: milestones are ordered, explicit cross-milestone dependencies are rare in practice.
- [ ] **Feature completion reports** -- Generate summary of what shipped per milestone. Defer: GitHub milestones already track this adequately.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On |
|---------|------------|---------------------|----------|------------|
| Slash command migration | MEDIUM | MEDIUM | P1 | Nothing (independent) |
| PR-FAQ ingestion | HIGH | LOW | P1 | Nothing |
| Roadmap generation | HIGH | HIGH | P1 | PR-FAQ ingestion |
| Feature registry | HIGH | MEDIUM | P1 | Roadmap generation |
| Feature-aware workstream creation | HIGH | MEDIUM | P1 | Feature registry |
| Enhanced context assembly | MEDIUM | LOW | P1 | Feature-aware workstreams |
| GitHub Issues sync | MEDIUM | MEDIUM | P2 | Feature registry |
| Roadmap refresh | MEDIUM | HIGH | P2 | PR-FAQ + Roadmap + Feature registry |
| Bidirectional issue sync | LOW | HIGH | P3 | GitHub Issues sync |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add in v2.x when core is validated
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | CCPM | APM | BranchOS v2 |
|---------|------|-----|-------------|
| Requirements input | AI-brainstormed PRD (`/pm:prd-new`) | Manual specs | PO-authored PR-FAQ (ingested, not generated) |
| Planning output | Epic + tasks (in-memory until sync) | Spec files with agent memory | ROADMAP.md + feature files (git-committed, PR-reviewable) |
| Feature tracking | GitHub Issues as source of truth | File-based memory system | Feature registry files + optional GitHub Issues sync |
| Acceptance criteria | In task files (developer-focused) | Not explicit | First-class in feature files (readable by QA/testers) |
| Issue sync | `epic-sync` pushes directly to GitHub | None | Explicit `sync-issues` command with review step before sync |
| Context loading | Epic context files in `.claude/context/` | Handover protocols between agents | Context packets with feature context injected into existing assembly |
| Parallel execution | Git worktrees for parallel agents | Multiple specialized agents | One workstream per developer (existing model, simpler) |
| Assignment | GitHub Issues | Agent specialization | GitHub Issues (not rebuilt -- use what exists) |
| Review step | None (direct sync to GitHub) | None | Git-committed artifacts, team reviews roadmap in PR before sync |
| CLI architecture | Slash commands | CLAUDE.md rules + slash commands | Migrating to slash-command-only (bootstrapper CLI) |

### Key Differentiations from CCPM

1. **PO-authored vs AI-generated requirements:** BranchOS respects the product owner role. CCPM brainstorms requirements with AI, risking hallucinated or poorly-scoped requirements.
2. **Git-committed reviewable artifacts:** BranchOS roadmaps and features are committed to git and reviewed in PRs before action. CCPM syncs directly to GitHub Issues without a team review gate.
3. **Acceptance criteria for non-developers:** BranchOS feature files are designed to be readable by QA/testers. CCPM tasks are developer-focused.
4. **Explicit refresh over auto-sync:** BranchOS uses explicit commands for sync/refresh. Users control when state changes propagate.

### Key Differentiations from APM

1. **Simpler model:** BranchOS uses one workstream per developer, not multiple specialized agents with handover protocols. Less cognitive overhead.
2. **Existing workflow enhancement:** BranchOS adds a planning layer above its already-shipped workstream model. APM is a standalone framework you adopt wholesale.
3. **Feature registry as first-class concept:** APM uses generic spec files. BranchOS has structured feature files with status lifecycle and acceptance criteria.

## Expected Behavior Patterns

### PR-FAQ Ingestion

**What users expect:**
- Point BranchOS at a PR-FAQ.md file (or it finds one at a conventional path like `./PR-FAQ.md` or `.branchos/shared/PR-FAQ.md`)
- Tool validates the document has expected sections (Press Release, Customer FAQ, Internal FAQ)
- Tool stores a copy in `.branchos/shared/PR-FAQ.md`
- Tool stores a content hash for later change detection
- Validation is lenient -- warn on missing sections, don't reject the document
- Standard PR-FAQ structure: Heading, Subheading, Summary, Problem, Solution, Quote, CTA, then External FAQ and Internal FAQ sections

**What NOT to do:**
- Don't enforce rigid format. PR-FAQs vary across organizations. Look for headings, not exact structure.
- Don't generate the PR-FAQ. The PO writes it. This is the "working backwards" discipline.
- Don't modify the PR-FAQ. Read-only ingestion.

### Roadmap Generation

**What users expect:**
- Run a command, AI reads the PR-FAQ, outputs a structured roadmap
- Roadmap has milestones (ordered delivery chunks) with features inside each
- Each feature has: ID, title, description, acceptance criteria, suggested branch name
- Dependencies between features are explicit
- Output is editable markdown -- team can modify before committing
- 5-15 features per milestone is manageable; more creates overwhelm

**What NOT to do:**
- Don't make the output a binary format or database. Markdown in git.
- Don't assign features. That's GitHub Issues' job.
- Don't over-generate. Quality over quantity in features.

### Feature Registry

**What users expect:**
- One file per feature in `.branchos/shared/features/`
- Machine-readable frontmatter (YAML) + human-readable body (markdown)
- Status lifecycle: `unassigned -> assigned -> in-progress -> complete`
- Acceptance criteria as a checklist (`- [ ]` format)
- List command shows all features with status, milestone, branch in a table

**Expected feature file format:**
```markdown
---
id: auth-system
title: User Authentication System
milestone: M1
status: unassigned
branch: feature/auth-system
issue: null
---

# User Authentication System

## Description
[What this feature does and why]

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Users can log in and receive a session token
- [ ] Invalid credentials return appropriate error messages
- [ ] Sessions expire after 24 hours of inactivity
```

### GitHub Issues Sync

**What users expect:**
- Run sync command, issues appear on GitHub
- Issue title = feature title
- Issue body = feature description + acceptance criteria
- Labels and milestone set automatically
- Issue number stored back in feature frontmatter
- Re-running sync updates existing issues (doesn't create duplicates)
- Idempotent operation -- safe to run multiple times

**Implementation approach:**
- Use `gh issue create --title "..." --body-file <path> --label branchos --milestone "M1"` for new issues
- Use `gh issue edit <number> --body-file <path>` for updates
- Track issue number in feature frontmatter to detect existing issues and avoid duplication
- Requires `gh` CLI installed and authenticated (hard dependency -- document clearly)

### Slash Command Migration

**What users expect:**
- All existing CLI commands become `/branchos:*` slash commands
- CLI is reduced to `branchos init` (setup) and `branchos install-commands` (install slash commands to `~/.claude/commands/`)
- New v2 commands are slash-command-only from the start (no CLI equivalents)
- Slash commands shell out to `npx branchos <subcommand>` internally

**Migration mapping:**
- `branchos map-codebase` -> `/branchos:map-codebase` (already exists)
- `branchos context` -> `/branchos:context` (already exists)
- `branchos discuss-phase` -> `/branchos:discuss-phase` (already exists)
- `branchos plan-phase` -> `/branchos:plan-phase` (already exists)
- `branchos execute-phase` -> `/branchos:execute-phase` (already exists)
- New: `/branchos:ingest-prfaq` (v2 only)
- New: `/branchos:plan-roadmap` (v2 only)
- New: `/branchos:features` (v2 only)
- New: `/branchos:sync-issues` (v2.x)
- New: `/branchos:refresh-roadmap` (v2.x)

## Sources

- [CCPM - Claude Code Project Management](https://github.com/automazeio/ccpm) -- Most directly comparable tool, uses PRD-to-epic-to-tasks pipeline with GitHub Issues sync (HIGH confidence)
- [APM - Agentic Project Management](https://github.com/sdi2200262/agentic-project-management) -- Multi-agent workflow framework with spec-driven development (MEDIUM confidence)
- [gh issue create CLI docs](https://cli.github.com/manual/gh_issue_create) -- GitHub CLI for programmatic issue creation with `--body-file`, `--label`, `--milestone` flags (HIGH confidence)
- [Amazon PR/FAQ Working Backwards](https://workingbackwards.com/resources/working-backwards-pr-faq/) -- Working Backwards methodology and document structure (HIGH confidence)
- [PR-FAQ format guide](https://productstrategy.co/working-backwards-the-amazon-prfaq-for-product-innovation/) -- Detailed PR-FAQ section structure: heading, subheading, summary, problem, solution, quote, CTA, FAQs (MEDIUM confidence)
- [YAML frontmatter conventions](https://docs.github.com/en/contributing/writing-for-github-docs/using-yaml-frontmatter) -- GitHub's frontmatter format for metadata in markdown files (HIGH confidence)
- [SPECLAN spec management](https://dev.to/thlandgraf/i-built-a-spec-management-extension-with-a-wysiwyg-markdown-editor-in-a-vs-code-webview-lessons-h5d) -- Feature spec lifecycle with YAML frontmatter (draft -> review -> approved -> in-development -> released) (MEDIUM confidence)

---
*Feature research for: BranchOS v2 project-level planning layer*
*Researched: 2026-03-09*
