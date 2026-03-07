# Domain Pitfalls

**Domain:** CLI developer workflow tool with git-committed file-based state, branch-scoped workstreams, multi-developer coordination
**Project:** BranchOS
**Researched:** 2026-03-07
**Confidence:** HIGH (training data covers this problem space thoroughly -- Terraform state, git-based CMS tools, and similar state-in-repo patterns are well-documented failure modes)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or team-wide workflow breakdowns.

---

### Pitfall 1: Git Merge Conflicts in Machine-Generated State Files

**What goes wrong:** BranchOS commits all `.branchos/` artifacts to git. When two developers create or modify workstreams and merge branches, `state.json` files, shared codebase maps, and other machine-generated JSON/structured files produce git merge conflicts that are unintelligible to developers. Unlike source code, these files have no semantic meaning to humans -- a three-way merge on `state.json` produces garbage.

**Why it happens:** The decision to commit all artifacts to git means every structured file becomes a merge surface. JSON is particularly hostile to git merging -- reordered keys, changed array indices, and nested objects create diff noise. The shared layer (`.branchos/shared/`) is the worst offender: every branch touches the same codebase map.

**Consequences:**
- Developers manually resolve merge conflicts in files they don't understand
- Corrupt state goes undetected until the next `branchos` command fails
- Team loses trust in the tool and abandons it
- Shared codebase map becomes a merge bottleneck on every PR

**Warning signs:**
- During early team testing, shared codebase map creates merge conflicts on nearly every PR
- Developers start adding `.branchos/` to `.gitignore` to avoid conflicts
- `state.json` merge resolutions produce invalid JSON

**Prevention:**
1. Design state files for merge-friendliness from day one: one file per concern, append-only where possible, avoid arrays (use objects keyed by stable IDs instead)
2. For the shared codebase map: use a single-writer model where `branchos map-codebase` always regenerates from scratch rather than patching. Conflicts resolve by "take theirs" -- the most recent map wins
3. Add a `branchos repair` command that validates and fixes corrupt state
4. Use `.gitattributes` to mark specific files with custom merge drivers (e.g., `*.branchos.json merge=branchos`)
5. Consider a merge strategy attribute: `state.json` could use `merge=ours` for workstream-scoped files (the branch owner's version is always correct)

**Phase mapping:** Must be addressed in Phase 1 (state format design). Retrofitting merge-friendly formats after adoption is a breaking change.

---

### Pitfall 2: Orphaned Workstream State After Branch Operations

**What goes wrong:** Workstreams are identified by branch name, but git branches are ephemeral. Developers rebase, rename branches, delete and recreate branches, use `git checkout -b` with typos, or have branches deleted by GitHub after PR merge. The workstream state becomes orphaned -- files exist in `.branchos/workstreams/<old-branch-name>/` but no branch matches.

**Why it happens:** Branch names are mutable identifiers used as directory names. Git provides no lifecycle hooks for branch rename/delete that a CLI tool can intercept. The auto-ID-from-branch-name design means any branch name change breaks the link.

**Consequences:**
- `.branchos/workstreams/` accumulates dead directories
- `branchos status` shows phantom workstreams
- Developer creates a "new" workstream on a renamed branch, losing previous planning context
- Archival logic can't match merged branches to workstream directories

**Warning signs:**
- During testing, a branch rename immediately orphans state
- After PR merges via GitHub, workstream archival fails because the local branch is gone
- `branchos status` output grows with ghost entries

**Prevention:**
1. Store branch name in workstream metadata (inside `state.json`) as a soft link, not as the directory name. Use a stable workstream ID (short hash or sequential ID) for the directory.
2. Add a reconciliation command (`branchos reconcile`) that matches workstreams to current branches and flags orphans
3. On workstream creation, record the initial commit SHA as an anchor point -- even if the branch is renamed, the commit graph can locate it
4. Archival should work from merge commit detection (walk the git log), not branch name matching

**Phase mapping:** Core identity model must be decided in Phase 1. The auto-ID-from-branch design in PROJECT.md is the specific thing to be careful about -- use branch name as display name but not as the storage key.

---

### Pitfall 3: Stale Shared Context Causing AI Hallucinations

**What goes wrong:** The shared codebase map in `.branchos/shared/` goes stale as the codebase evolves. Claude Code receives outdated architecture information, references deleted files, suggests patterns that have been refactored away, or misses new modules. The AI gives confidently wrong guidance based on BranchOS's stale context.

**Why it happens:** Staleness detection based on "N commits behind" is a heuristic. A single commit can restructure the entire codebase. Developers skip the refresh because it takes time. The shared map is updated on one branch but not yet merged to others, so different developers see different versions of "truth."

**Consequences:**
- AI suggests edits to files that no longer exist
- Architectural guidance contradicts recent refactoring
- Developer trusts BranchOS context over their own knowledge, introducing bugs
- Different developers get different AI guidance because their branches have different shared map versions

**Warning signs:**
- Codebase map references files that return 404
- AI suggestions conflict with recent team decisions
- Developers stop trusting the `map-codebase` output

**Prevention:**
1. Staleness detection should check file existence, not just commit count. If the map references files that don't exist on disk, it's stale regardless of commit count.
2. Include a lightweight hash of file tree structure (just paths, not contents) in the map metadata. Compare on every context assembly -- warn if tree has changed.
3. Context assembly should include a freshness disclaimer in the prompt when the map is older than a threshold
4. Consider differential updates: track which files changed since last map, only re-analyze those

**Phase mapping:** Staleness detection belongs in Phase 2 (after basic mapping works). But the map metadata format that enables staleness checking must be designed in Phase 1.

---

### Pitfall 4: Context Packet Explosion

**What goes wrong:** The context packet assembled for Claude Code (shared context + workstream metadata + branch diff + plan + execution state + decisions) exceeds useful context window size. The AI gets so much context that it loses focus, or the tool silently truncates important information.

**Why it happens:** Each layer of the context packet grows independently. A large codebase map + a complex plan + a big diff + accumulated decisions = tens of thousands of tokens. Nobody budgets the context window during design, so it's discovered when the tool is already in use.

**Consequences:**
- Claude Code ignores parts of the context or gives shallow responses
- Silent truncation drops critical information (often the most recent, most relevant state)
- Developers don't understand why AI quality degrades on large workstreams
- Workaround is manual context curation, defeating the tool's purpose

**Warning signs:**
- Context packets exceed 8K tokens during testing with realistic workstreams
- AI responses ignore information that's clearly in the context
- Longer workstreams produce worse AI guidance than shorter ones

**Prevention:**
1. Set a hard token budget for context packets (e.g., 12K tokens) and design each layer with a sub-budget
2. Implement relevance filtering: not all decisions matter for every phase. Execution phase doesn't need full discuss-phase transcripts.
3. Summarize older phases instead of including raw artifacts. Phase N should see summaries of phases 1 through N-2, details of N-1, and full context of N.
4. Include a "context manifest" at the top of the packet listing what was included and what was omitted, so the AI knows what it doesn't have

**Phase mapping:** Context assembly design is Phase 2 or 3, but the storage format that enables summarization (clear phase boundaries, separable artifacts) must be Phase 1.

---

### Pitfall 5: Slash Command Integration Fragility

**What goes wrong:** BranchOS relies on Claude Code slash commands for context injection. Slash command APIs are not stable, documented, or versioned by Anthropic. A Claude Code update changes how slash commands work, breaking BranchOS for every user simultaneously.

**Why it happens:** Building on an undocumented integration surface. Claude Code is a rapidly evolving product. Slash command behavior, available APIs, and context injection mechanisms can change without notice.

**Consequences:**
- A Claude Code update breaks BranchOS with no migration path
- Users blame BranchOS for what's actually a Claude Code change
- No way to pin Claude Code versions in team environments
- Entire tool becomes unusable until updated

**Warning signs:**
- Claude Code release notes mention slash command changes
- Slash command behavior varies between Claude Code versions on the team
- Integration tests pass locally but fail for users on different Claude Code versions

**Prevention:**
1. Abstract the Claude Code integration behind an adapter layer. The core tool should produce context packets as plain text/markdown. The slash command is one delivery mechanism, not the only one.
2. Support a fallback mode: `branchos context` outputs context to stdout/clipboard, usable via paste if slash commands break
3. Design the context output to be copy-paste friendly (self-contained markdown) so it works even without slash command integration
4. Add a `branchos doctor` command that validates the Claude Code integration is working
5. Pin and document the minimum Claude Code version. Test against Claude Code updates in CI.

**Phase mapping:** Adapter layer architecture should be Phase 1. The temptation will be to hard-couple to slash commands for speed -- resist this.

---

## Moderate Pitfalls

### Pitfall 6: Race Condition in Concurrent Workstream Creation

**What goes wrong:** Two developers simultaneously run `branchos` commands that modify the shared layer. One developer's codebase map write is partially overwritten by another's. File-level conflict detection races when two developers claim overlapping files.

**Why it happens:** File-based state has no locking mechanism. Git commits are not atomic across multiple files. Two developers on different branches can both modify `.branchos/shared/` and only discover the conflict at merge time.

**Prevention:**
1. Shared layer writes should be idempotent and regenerative (full rewrite, not patch)
2. Conflict detection should be read-only against committed state, never write to shared files
3. Consider a lock file pattern (`.branchos/shared/.lock`) for operations that modify shared state, with stale lock detection
4. Document that `map-codebase` should be run on main/trunk, not feature branches

**Phase mapping:** Phase 2 (when implementing conflict detection).

---

### Pitfall 7: Workstream State Schema Evolution

**What goes wrong:** `state.json` format changes between BranchOS versions. Developers on different versions produce incompatible state. Old workstreams can't be read by new versions. No migration path exists.

**Why it happens:** Greenfield projects iterate on state format rapidly. Without schema versioning from day one, every format change is a breaking change.

**Prevention:**
1. Include a `schemaVersion` field in every state file from the very first version
2. Implement forward-compatible reading: unknown fields are preserved, not dropped
3. Write migration functions keyed by schema version. Run automatically on read.
4. Never remove fields -- deprecate and ignore them

**Phase mapping:** Phase 1. The `schemaVersion` field must be in the initial format.

---

### Pitfall 8: Workstream Archival Loses Important Context

**What goes wrong:** When a branch merges and the workstream is archived, the planning context (decisions, discussion, architectural reasoning) becomes hard to find. Future developers working in the same area can't discover why decisions were made.

**Why it happens:** Archival moves state out of the active namespace. There's no search or discovery mechanism. Git history technically preserves everything, but nobody will `git log` through `.branchos/workstreams/feature-auth/decisions.md`.

**Prevention:**
1. Archival should produce a summary document committed to a discoverable location (e.g., `.branchos/archive/` with an index)
2. Key decisions should be promoted to the shared layer, not buried in workstream archives
3. Consider a `branchos history <file>` command that shows which workstreams touched a given file

**Phase mapping:** Phase 3 or later (archival is not MVP), but the decision storage format in Phase 1 should anticipate this.

---

### Pitfall 9: npm Global Install Pain

**What goes wrong:** `npm install -g` is notoriously unreliable across platforms. Permission issues on macOS/Linux, path issues on Windows, nvm/volta/fnm version manager conflicts, corporate proxies blocking npm. First-run experience fails before the tool is ever used.

**Why it happens:** Global npm packages are a known pain point. Every Node.js version manager handles them differently. Corporate environments add layers of complexity.

**Prevention:**
1. Support `npx branchos` as an alternative to global install
2. Provide clear error messages for common install failures (permissions, path, Node.js version)
3. Minimum Node.js version should be 18 (LTS) -- don't require cutting-edge
4. Test install on macOS, Linux, and Windows in CI
5. Consider a standalone binary distribution (pkg, bun compile, or similar) as a future option

**Phase mapping:** Phase 1 (distribution setup).

---

### Pitfall 10: Testing a Git-Dependent Tool

**What goes wrong:** Unit tests that depend on real git operations are slow, flaky, and hard to set up. Tests need real repos with branches, commits, and merges. CI environments have different git configurations. Test isolation requires creating and destroying repos per test.

**Why it happens:** The tool is deeply integrated with git. Mocking git is fragile (too many edge cases). Real git operations in tests are slow and stateful.

**Prevention:**
1. Separate pure logic (state parsing, context assembly, conflict detection) from git operations. Test pure logic without git.
2. Create a small git test fixture library: helper functions that create repos with specific branch/commit topologies
3. Use `git init --bare` + `git clone` for test repos (faster than full repos)
4. Integration tests run against real git but are tagged separately for CI
5. Consider snapshot testing for context packet output

**Phase mapping:** Phase 1 (testing infrastructure should be set up alongside the first feature).

---

## Minor Pitfalls

### Pitfall 11: Over-Engineering Conflict Detection

**What goes wrong:** File-level conflict detection seems simple but has edge cases: renamed files, moved files, files that exist in one branch but not another, symlinks, generated files. The temptation is to handle every edge case, turning a simple feature into a mini version control system.

**Prevention:**
1. Stick to the simplest possible detection: "do any workstreams list the same file path in their modified files?"
2. Use git's own diff machinery to detect file changes, don't reimplement it
3. Accept false positives (flag conflicts that aren't real) over false negatives (miss real conflicts)
4. Ship the simple version, then add nuance based on actual user complaints

**Phase mapping:** Phase 2 (conflict detection).

---

### Pitfall 12: CLAUDE.md vs Slash Commands Confusion

**What goes wrong:** PROJECT.md explicitly says "not CLAUDE.md injection" but developers using BranchOS will also have their own CLAUDE.md files. BranchOS context and CLAUDE.md context may conflict, contradict, or duplicate information. Users won't know which context source is authoritative.

**Prevention:**
1. Document clearly how BranchOS context relates to CLAUDE.md
2. BranchOS context packets should never contradict standard CLAUDE.md patterns
3. Consider reading CLAUDE.md as input to avoid duplication
4. Context packets should identify themselves as BranchOS-provided

**Phase mapping:** Phase 2 (context assembly).

---

### Pitfall 13: Assuming Linear Branch Workflows

**What goes wrong:** BranchOS assumes one workstream per branch and one branch per workstream. Real workflows include: stacked PRs (branch off a branch), shared feature branches where multiple developers commit, hotfix branches created from release tags, and developers who work on multiple things in one branch.

**Prevention:**
1. Don't enforce 1:1 branch-workstream mapping -- allow `--name` override to decouple
2. Support creating a workstream without a branch (for pre-planning)
3. Don't break when a branch has multiple workstreams or a workstream spans branches
4. Document supported workflows explicitly

**Phase mapping:** Phase 1 (workstream identity model).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| State format design | Merge-hostile JSON structure (Pitfall 1) | Design for merge-friendliness: stable keys, avoid arrays, one file per concern |
| Workstream identity | Branch name as directory key (Pitfall 2) | Use stable IDs for storage, branch name for display only |
| Schema design | No version field (Pitfall 7) | Add `schemaVersion` to every file from v1 |
| Codebase mapping | Stale maps go undetected (Pitfall 3) | Include file tree hash in map metadata |
| Context assembly | Context packets too large (Pitfall 4) | Budget tokens per layer, summarize older phases |
| Claude Code integration | Hard coupling to slash commands (Pitfall 5) | Adapter layer, fallback to stdout/clipboard |
| Conflict detection | Over-engineering edge cases (Pitfall 11) | Start with simple path matching, iterate from user feedback |
| Archival | Lost decisions (Pitfall 8) | Promote key decisions to shared layer |
| Distribution | npm global install failures (Pitfall 9) | Support npx, test across platforms |
| Testing | Git-dependent tests are slow/flaky (Pitfall 10) | Separate pure logic from git operations |

## Sources

- Domain expertise from Terraform state management patterns (state file merge conflicts are the canonical example of this problem class)
- Git merge driver documentation and `.gitattributes` patterns
- npm global install pain points are extensively documented in Node.js ecosystem (nvm, volta, fnm compatibility)
- Claude Code slash command integration is based on current Claude Code documentation (subject to change -- this is the core risk of Pitfall 5)

**Confidence note:** These pitfalls are derived from well-understood patterns in git-committed state management, CLI tool distribution, and AI context assembly. The specific BranchOS design decisions in PROJECT.md (committed artifacts, branch-derived IDs, slash command integration) map directly to known failure modes. HIGH confidence on pitfalls 1, 2, 4, 7, 9, 10. MEDIUM confidence on pitfalls 3, 5 (dependent on Claude Code's evolution). HIGH confidence on pitfalls 6, 8, 11, 12, 13 (standard patterns).
