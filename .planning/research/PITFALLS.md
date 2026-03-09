# Pitfalls Research

**Domain:** CLI developer workflow tool -- adding project-level planning layer (PR-FAQ ingestion, roadmap generation, feature registry, GitHub Issues sync, slash-command migration) to existing v1 system
**Project:** BranchOS v2.0
**Researched:** 2026-03-09
**Confidence:** HIGH (codebase analysis, API documentation, community patterns, prior v1 pitfalls research)

## Critical Pitfalls

### Pitfall 1: GitHub Issues sync creates duplicates on re-run

**What goes wrong:**
`sync-issues` creates duplicate GitHub Issues every time it runs because there is no reliable deduplication key. Title-based matching is fragile (titles get edited on GitHub), and label-based matching misses renamed or relabeled issues. Teams end up with 3 copies of "Auth System" cluttering their issue tracker and lose trust in the tool.

**Why it happens:**
GitHub's REST API has no built-in idempotency for issue creation. `POST /repos/{owner}/{repo}/issues` always creates a new issue. Developers assume "search by title first" is sufficient, but titles are edited on GitHub's side, creating drift between the local feature registry and remote issues.

**How to avoid:**
Store the GitHub Issue number back into the local feature file after creation. The feature file (e.g., `.branchos/shared/features/auth-system.md`) becomes the source of truth for the link. On subsequent `sync-issues` runs:
1. If the feature file has an `issue: #N` field in frontmatter, update that issue (PATCH), do not create.
2. If no issue number stored, search by a tool-controlled label like `branchos:auth-system` (not title).
3. Only create if both checks fail.
4. Always write the issue number back to the feature file and git commit immediately after creation.

**Warning signs:**
- Feature files have no `issue` field after sync
- Tests only cover the "create new" code path, not "update existing"
- No integration test that runs `sync-issues` twice and asserts zero new issues

**Phase to address:**
GitHub Issues sync phase. The `issue` field must be designed into the feature file schema from the start (feature registry phase), even if sync is built later.

---

### Pitfall 2: PR-FAQ parsing is brittle -- assumes exact markdown structure

**What goes wrong:**
The PR-FAQ parser breaks when the Product Owner uses slightly different heading levels, adds extra sections, uses bullet lists instead of paragraphs, or includes unexpected markdown features (tables, callouts, HTML). The tool either crashes or silently drops sections, producing an incomplete roadmap.

**Why it happens:**
Developers build parsers that match exact heading text (`## Press Release`, `## Customer FAQ`) instead of parsing structure flexibly. Markdown is freeform -- there is no enforced schema. The PR-FAQ is a "living document" that evolves, and each edit risks breaking the parser.

**How to avoid:**
Do NOT parse PR-FAQ with regex or rigid heading matchers. Instead:
1. Use YAML frontmatter for machine-readable metadata (feature list, milestone names, priorities). The prose sections are for AI consumption during roadmap generation, not structured extraction.
2. When generating the roadmap, pass the entire PR-FAQ content to Claude as context rather than trying to extract structured data programmatically.
3. If you must parse sections, use a proper markdown AST parser (remark/unified ecosystem) and match on heading hierarchy, not exact text.
4. Validate gracefully: warn about unrecognized sections rather than failing.

**Warning signs:**
- Parser uses regex like `/^## Press Release$/`
- No test cases with "messy" PR-FAQ input (extra headings, typos, reordered sections)
- Parser fails on the first real PO-written document

**Phase to address:**
PR-FAQ ingestion (first phase). Get the parsing approach right before anything depends on it.

---

### Pitfall 3: Roadmap refresh destroys manual edits

**What goes wrong:**
Team reviews roadmap, manually adjusts milestones, reorders features, adds notes. Then PR-FAQ changes and someone runs `refresh-roadmap`. The regenerated roadmap overwrites all manual edits because it was generated fresh from the PR-FAQ.

**Why it happens:**
The vision says "explicit refresh-roadmap command" but does not specify merge semantics. The naive implementation regenerates from scratch. Since the roadmap is AI-generated markdown, there is no structured diff mechanism -- it is a full replacement.

**How to avoid:**
1. Separate machine-generated content from human edits. Use YAML/JSON for machine-managed parts (milestone order, feature assignments, dependencies) and markdown body for human prose. Refresh only regenerates the structured parts.
2. Alternatively, on refresh, show a diff of what changed and require confirmation before writing. `refresh-roadmap` should be a review workflow, not a blind overwrite.
3. Store a content hash of the PR-FAQ that was used to generate the current roadmap. On refresh, show what changed in the PR-FAQ since last generation.
4. Consider `ROADMAP.md` as human-owned after initial generation. Refresh produces a `ROADMAP.proposed.md` for review, not a direct overwrite.

**Warning signs:**
- `plan-roadmap` and `refresh-roadmap` use the same code path with no merge logic
- No test for "refresh after manual edit preserves edits"
- ROADMAP.md has no metadata about when/how it was generated

**Phase to address:**
Roadmap generation phase. The refresh strategy must be designed alongside initial generation, not bolted on later.

---

### Pitfall 4: Slash-command migration breaks existing users with no escape hatch

**What goes wrong:**
Migrating from CLI commands to slash-command-only architecture means existing `branchos workstream create` invocations stop working. Users who have muscle memory, scripts, or documentation referencing CLI commands are stranded. Worse, if the slash commands require Claude Code but users sometimes work without it, they lose all functionality.

**Why it happens:**
The vision says "CLI reduced to bootstrapper (init, install slash commands)" which implies removing working CLI commands. The assumption is everyone uses Claude Code all the time, but teams have mixed workflows. Additionally, Claude Code merged slash commands into "skills" in v2.1.3 (January 2026), so the installation target directory and mechanism may need updating.

**How to avoid:**
1. Keep CLI commands working throughout v2. Deprecate with warnings, do not remove.
2. Slash commands should shell out to the CLI (as they already do for `context`), not replace the CLI logic. The CLI is the engine; slash commands are the UX layer.
3. Add a deprecation notice: `branchos workstream create` prints "Tip: Use /branchos:workstream-create in Claude Code" but still works.
4. Account for the Claude Code slash-commands-to-skills migration. Install to `.claude/commands/` (still backwards compatible) but also support `.claude/skills/` as the forward path. Both directories work in Claude Code 2.1.3+.
5. New v2 commands should ship with both CLI and slash command interfaces from day one.

**Warning signs:**
- PRs that delete CLI command registrations from Commander
- No `--help` output mentions slash command equivalents
- `install-commands` only targets `~/.claude/commands/`, not project-level `.claude/commands/` or `.claude/skills/`

**Phase to address:**
Should be a constraint across ALL phases, not a single migration phase. Each new feature should have both CLI and slash command interfaces.

---

### Pitfall 5: Feature registry becomes stale -- no single source of truth

**What goes wrong:**
Feature status lives in three places: the feature file (`.branchos/shared/features/auth-system.md`), the GitHub Issue (open/closed, labels), and the workstream state (`state.json`). They drift apart. The feature file says "in-progress" but the GitHub Issue is closed. Or the workstream is archived but the feature still says "assigned."

**Why it happens:**
Distributed state without automatic reconciliation. Each system (local files, GitHub, workstreams) is updated independently. The vision says "assignment happens on GitHub" but status tracking is local. There is no event-driven sync.

**How to avoid:**
1. Make feature files the single source of truth for BranchOS. GitHub Issues are a projection (created from features), not the authority.
2. Status in feature files should only change through BranchOS commands, never manual edits.
3. Do NOT try to sync status back from GitHub. It adds complexity without proportional value for a 2-5 person team. The team knows what is happening.
4. Document explicitly: "GitHub Issue status and feature file status may diverge. Feature files reflect BranchOS workflow state. GitHub Issues reflect team discussion."

**Warning signs:**
- Feature status enum has states that mirror GitHub Issue states (e.g., "closed")
- Code that polls GitHub Issues to update local feature files
- Multiple commands can change feature status through different code paths

**Phase to address:**
Feature registry phase. The status model must be designed before GitHub sync is built.

---

### Pitfall 6: Schema migration becomes a combinatorial nightmare

**What goes wrong:**
v2 adds `featureId`, `issueNumber`, and `projectContext` fields to `WorkstreamMeta` and `WorkstreamState`. The existing chained migration system (v0->v1->v2) needs a v2->v3 migration. But if feature registry also needs its own schema, and PR-FAQ metadata needs a schema, you end up with 3-4 separate schema systems that all need migration logic, versioning, and testing.

**Why it happens:**
The current migration system in `src/state/schema.ts` is workstream-focused (`state.json` and `meta.json` only). v2 introduces new file types (feature files, roadmap metadata, PR-FAQ metadata) that each need their own structure. Developers add ad-hoc schema handling to each new file type instead of generalizing.

**How to avoid:**
1. Use YAML frontmatter for all new markdown files (features, roadmap) with a `schemaVersion` field. The existing `migrateIfNeeded` pattern works -- extend it rather than creating parallel systems.
2. Define all new interfaces upfront: `FeatureFile`, `RoadmapMeta`, `ProjectConfig`. Add them to a single schema registry.
3. Keep the workstream migration chain simple: one version bump (schema v2 -> v3) that adds all v2.0 fields to existing files. Do NOT create separate version tracks per file type.
4. New file types (features, roadmap) start at schema v1 with their own migration chains but share the same `migrateIfNeeded` infrastructure.

**Warning signs:**
- Multiple `migrateIfNeeded` functions with different version tracks and no shared code
- Feature files have no `schemaVersion` field
- Tests only cover fresh creation, not migration from v1 workstream state

**Phase to address:**
Must be decided in the first phase (PR-FAQ/foundation) and enforced in every subsequent phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Embedding slash command content as string literals in `install-commands.ts` | Single file, no asset loading | Adding/editing commands requires rebuilding npm package; 500+ line template literals are unreadable | Never for v2 -- move to separate .md files loaded at install time |
| Regex-based markdown parsing for PR-FAQ | Quick to implement for known format | Breaks on unexpected input, hard to extend, no error recovery | Only for simple frontmatter extraction (YAML between `---` fences); use AST for body parsing |
| Storing feature state in markdown prose instead of frontmatter | Human-readable at a glance | Hard to query programmatically, parsing is fragile | Never -- use YAML frontmatter for machine state, markdown body for human description |
| Single-file roadmap (combined machine + human content) | Simpler file structure | Refresh destroys edits, no way to tell what is auto-generated vs. human-written | Only in initial MVP if `refresh-roadmap` is not yet implemented |
| Skipping GitHub API rate limiting / retry | Faster development, less code | Fails silently when rate limited; 2-5 person team unlikely to hit limits but CI/testing might | Acceptable in MVP if you handle 403 responses with a clear error message |
| Direct `gh` CLI subprocess calls instead of GitHub REST API | No need for auth token management, simpler code | Requires `gh` installed and authenticated; harder to test | Acceptable -- `gh` handles auth well and BranchOS is a CLI tool for developers who likely have `gh` |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub Issues API via `gh` | Creating issues without storing the returned issue number locally | Always parse `gh issue create` output for the issue URL/number, write back to feature file, git commit |
| GitHub Issues API via `gh` | Using title match to find existing issues | Search by tool-controlled label (`branchos:<feature-id>`); titles are user-editable and unreliable |
| GitHub Issues API via `gh` | Assuming `gh` CLI is always available and authenticated | Check for `gh` binary and `gh auth status` before any sync operation; provide clear error with install instructions |
| GitHub Labels | Creating labels without checking existence | Use `gh label create` which does not error if label exists (with `2>/dev/null`), or check first |
| Claude Code commands/skills | Installing only to `~/.claude/commands/` (global) | Project-level `.claude/commands/` is better for team sharing and version control. Support both. |
| Claude Code commands/skills | Not accounting for the skills merge in v2.1.3 | Both `commands/` and `skills/` directories work; commands files are backwards compatible |
| Git auto-commits during sync | Auto-committing after each feature file update in a loop (N commits for N features) | Batch all changes, single commit at end of sync operation |
| simple-git library | Assuming git operations complete synchronously | simple-git operations are async; avoid concurrent git operations from the same process |
| `AssemblyInput` interface | Adding feature context as another optional string field (like `discussMd`) | The `AssemblyInput` interface already has 14 fields. Group feature context into a sub-object or create a `FeatureContext` type |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all feature files on every command invocation | Slow startup as feature count grows | Lazy-load: only read the feature linked to the current workstream | 50+ features (unlikely for 2-5 person team, but possible) |
| Calling `gh` CLI for each feature during `sync-issues` | Sync takes minutes; each `gh` call is a subprocess + HTTP request | Batch: `gh issue list --label branchos --json number,title,labels` fetches all at once, then diff locally | 15+ features |
| Regenerating full roadmap on every PR-FAQ change | Slow if using AI generation; burns API tokens | Hash PR-FAQ content, only regenerate if hash changed from stored hash | Any project where refresh is run more than occasionally |
| Assembling context with all feature files included in packet | Context packet grows beyond useful size, degrades AI quality | Include only the feature linked to current workstream, not all features | 20+ features with detailed acceptance criteria |
| Scanning all workstream directories to find current branch match | Slow with many archived workstreams | Index active workstreams in a lightweight manifest, or filter by `status: active` in meta.json | 50+ total workstreams (including archived) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing GitHub tokens in `.branchos/config.json` | Token committed to git, exposed to all repo collaborators | Never store tokens. Rely on `gh auth status`. The `gh` CLI handles authentication and token storage. |
| Including GitHub Issue body/comments in context packets | Private discussion, security reports, or sensitive info leaks into AI context | Only sync issue number, title, and labels. Never pull full issue body into local files. |
| `sync-issues` auto-creates issues in public repos without review | Internal feature names, acceptance criteria, and implementation plans become public | Always show dry-run output before creating issues; require `--confirm` flag or `--dry-run` default |
| Feature files with acceptance criteria committed to a public repo | Internal quality criteria and edge cases visible to competitors/public | This is by design (all artifacts in git), but warn users during `init` if repo is public |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| `sync-issues` silently succeeds with no output | User does not know what was created, updated, or skipped | Print a summary table: "Created: 3, Updated: 1, Skipped (unchanged): 5, Errors: 0" |
| `refresh-roadmap` overwrites without warning | User loses manual edits, loses trust in tool | Show diff preview, require confirmation. Or generate to `ROADMAP.proposed.md` for review. |
| Feature-aware workstream creation fails on wrong feature ID | User types wrong ID, gets cryptic "feature not found" error | List available features with fuzzy match: "Did you mean 'auth-system'? Available: auth-system, payment-flow, dashboard-ui" |
| `plan-roadmap` generates roadmap but user does not know what is editable | AI-generated roadmap feels opaque | Generate with clear markers: frontmatter is machine-managed, body sections are freely editable |
| PR-FAQ ingestion gives no feedback on what was understood | User does not know if their document was parsed correctly | Print extracted structure: "Found: Press Release (245 words), 3 Customer FAQs, 2 Internal FAQs" |
| New slash commands require memorizing names | Cognitive load increases with each new command | Add a `/branchos:help` command that lists all available commands with one-line descriptions |
| `discuss-project` is confusing vs `discuss-phase` | Users do not know which command to use when | Clear naming: `discuss-project` is for PR-FAQ creation, `discuss-phase` is for workstream phases. Help text should clarify. |

## "Looks Done But Isn't" Checklist

- [ ] **GitHub Issues sync:** Often missing the "update existing issue" path -- verify that running `sync-issues` twice produces zero new issues on second run
- [ ] **GitHub Issues sync:** Often missing label creation before issue creation -- verify that `branchos:<feature-id>` labels are created first
- [ ] **GitHub Issues sync:** Often missing error handling for unauthenticated `gh` -- verify clear error when `gh auth status` fails
- [ ] **PR-FAQ ingestion:** Often missing frontmatter validation -- verify that malformed YAML frontmatter produces a helpful error, not a crash or silent data loss
- [ ] **PR-FAQ ingestion:** Often missing encoding handling -- verify UTF-8 with special characters (accented names, em dashes) works
- [ ] **Feature registry:** Often missing the link back from workstream to feature -- verify that `workstream create --feature X` stores `featureId` in `meta.json` AND that context assembly includes feature acceptance criteria
- [ ] **Feature registry:** Often missing the `status` lifecycle -- verify that workstream completion updates feature status
- [ ] **Roadmap generation:** Often missing dependency validation -- verify that circular dependencies in features are detected and reported
- [ ] **Schema migration:** Often missing migration tests for existing v1 workstreams -- verify that a real v1 `state.json` with active phases migrates cleanly to v3 with new fields defaulted
- [ ] **Context assembly:** Often missing feature context in the packet -- verify that when a workstream has a linked feature, the acceptance criteria appear in the context output
- [ ] **Slash command installation:** Often missing project-level command support -- verify commands work from `.claude/commands/` in the project root (not just global `~/.claude/commands/`)
- [ ] **Slash command content:** Often missing `$ARGUMENTS` passthrough -- verify new slash commands accept and use arguments

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate GitHub Issues created | LOW | Search and close duplicates manually on GitHub; add dedup logic with label-based matching; re-run sync |
| PR-FAQ parser breaks on real input | LOW | Fix parser, re-ingest PR-FAQ; no data loss since PR-FAQ.md is the source document |
| Roadmap refresh overwrites manual edits | MEDIUM | Recover edits from `git diff HEAD~1 -- .branchos/shared/ROADMAP.md`; redesign refresh to use proposed-file pattern |
| Schema migration corrupts state files | HIGH | Restore from git (`git checkout HEAD~1 -- .branchos/`); add migration dry-run mode that validates without writing; snapshot state before migration |
| Feature status drift between local and GitHub | LOW | Accept it as expected behavior; document that local files are authoritative for BranchOS, GitHub is authoritative for team discussion |
| Slash commands break after Claude Code update | MEDIUM | Check Claude Code changelog for breaking changes; update install targets; CLI commands still work as fallback |
| Feature file schema has no version field | HIGH | Requires touching every feature file to add `schemaVersion`; prevent by including it from day one |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| PR-FAQ parsing brittleness | PR-FAQ ingestion (Phase 1) | Test with 3+ differently-formatted PR-FAQ documents including one written by a non-developer |
| Schema migration complexity | Foundation/PR-FAQ (Phase 1) | All new file types have `schemaVersion` in frontmatter; reuse `migrateIfNeeded` pattern |
| Roadmap refresh destroys edits | Roadmap generation (Phase 2) | Test: generate, manually edit, refresh, verify edits preserved or proposed-file created |
| Feature registry staleness / source of truth | Feature registry (Phase 3) | Feature file is the only place status changes; no GitHub-to-local sync code exists |
| GitHub Issues duplication | GitHub Issues sync (Phase 4) | Integration test: run sync twice, assert zero new issues on second run |
| Feature-workstream linking gaps | Feature-aware workstreams (Phase 5) | Verify `featureId` in `meta.json` AND acceptance criteria in context packet output |
| Context assembly bloat from features | Enhanced context (Phase 5/6) | Measure context packet size with 20+ feature files; verify only the relevant feature is included |
| Slash command migration breakage | Every phase (cross-cutting constraint) | All new features have both CLI command and slash command; CLI prints deprecation notice, not error |
| Slash commands vs skills directory | Installation (Phase 1 or dedicated) | Test install to both `commands/` and `skills/` directories; test with Claude Code 2.1.3+ |
| Single source of truth for feature status | Feature registry + GitHub sync phases | Audit: grep codebase for all places that write to feature status field; must be exactly one code path |

## Sources

- Codebase analysis: `src/state/schema.ts` (existing migration system), `src/state/meta.ts` (WorkstreamMeta interface), `src/context/assemble.ts` (AssemblyInput with 14 fields), `src/cli/install-commands.ts` (slash command content as string literals)
- [GitHub CLI `gh issue list` documentation](https://cli.github.com/manual/gh_issue_list) -- search and filter capabilities
- [GitHub CLI `gh issue create` documentation](https://cli.github.com/manual/gh_issue_create) -- no built-in deduplication
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills) -- unified commands/skills system
- [Claude Code slash commands to skills merge (v2.1.3, January 2026)](https://medium.com/@joe.njenga/claude-code-merges-slash-commands-into-skills-dont-miss-your-update-8296f3989697) -- backwards compatible
- [SSW Frontmatter best practices](https://www.ssw.com.au/rules/best-practices-for-frontmatter-in-markdown) -- YAML frontmatter formatting
- [Idempotent REST API design patterns](https://restfulapi.net/idempotent-rest-apis/) -- deduplication strategies
- Prior v1 pitfalls research (2026-03-07) -- git merge conflicts, orphaned state, context explosion pitfalls remain relevant

---
*Pitfalls research for: BranchOS v2.0 project-level planning layer*
*Researched: 2026-03-09*
