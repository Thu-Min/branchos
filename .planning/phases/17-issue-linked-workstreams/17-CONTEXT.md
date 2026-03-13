# Phase 17: Issue-Linked Workstreams - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Create workstreams from GitHub issues via `create-workstream --issue #N`. Issue is fetched from GitHub, reverse-looked-up to a feature (required — errors if no match), and the existing feature-linked workstream flow is reused. Issue metadata stored as issue.md in the workstream directory and surfaced in context packets. No new issue lifecycle management — just the creation bridge from issue to workstream.

</domain>

<decisions>
## Implementation Decisions

### Issue Fetch & Data Extraction
- Two gh CLI calls per issue: `gh issue view #N --json title,body,labels,url` for structured metadata, `gh issue view #N` for raw markdown body
- Extract title, body (raw markdown), labels, url, and issue number
- Store as `issue.md` in workstream directory with YAML frontmatter (number, title, labels, url) and raw markdown body

### Feature Reverse-Lookup
- Two-tier matching: first try exact match on `feature.issue === issueNumber`, then fall back to title similarity with 0.8 threshold (stricter than roadmap refresh's 0.6)
- If no feature matches: error and abort — `--issue` only works when the issue maps to a known feature
- When feature IS found: trigger full feature-linked flow (checkout feature branch, set featureId, mark feature in-progress) — same as `--feature` but triggered via issue number

### Context Packet Integration
- Separate "Issue Context" section in context packets, alongside (not merged into) feature context
- Full issue body included — no truncation
- Labels rendered inline after title: `## Issue: Fix auth timeout [bug, priority:high]`
- issue.md read from workstream directory during context assembly, formatted as a section

### CLI Flag & Workstream Flow
- `--issue #N` is a new third path in createWorkstream that delegates to the existing feature-linked flow
- `--issue` and `--feature` are mutually exclusive — error if both provided
- Input format: number only (`42` or `#42`), strip leading `#` if present
- `meta.issueNumber` populated with the issue number on creation (the field from Phase 16's schema v3)
- Issue fetch + reverse-lookup is the preamble; once featureId is resolved, existing `createFeatureLinkedWorkstream` handles the rest

### Claude's Discretion
- issue.md frontmatter field names and exact format
- How to structure the `fetchIssue` helper function
- Test structure and mock patterns for gh CLI calls
- Exact formatting of the Issue Context section in context packets
- Whether to add a `readIssueFile` utility or just use generic file reading

</decisions>

<specifics>
## Specific Ideas

- The flow is: `--issue #42` → fetch issue → find feature by issue number (or title similarity at 0.8) → error if no match → delegate to `createFeatureLinkedWorkstream` with resolved featureId → write issue.md as bonus artifact
- issue.md is a workstream-scoped artifact, not shared — each workstream has its own copy of the issue data at creation time
- Phase 18 (create-pr) will use `meta.issueNumber` for `Closes #N` in PR body — this is the field being populated here

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ghExec(args)` (`src/github/index.ts`): execFile wrapper for gh CLI — issue fetch will use this
- `createFeatureLinkedWorkstream()` (`src/workstream/create.ts`): Full feature-linked flow — issue path delegates to this after resolving featureId
- `readAllFeatures()` (`src/roadmap/feature-file.ts`): Read all features for reverse-lookup by issue number
- Title similarity matching from roadmap refresh — reusable for 0.8 threshold fallback (check `src/roadmap/` for existing implementation)

### Established Patterns
- `execFile` over `exec` for gh CLI calls (security decision)
- Two workstream creation paths in `createWorkstream`: standard (line 45-100) and feature-linked (line 103-203)
- `captureAssignee()` as precedent for gh CLI helper that returns data or handles unavailability
- Workstream artifacts stored as files in workstream directory (meta.json, state.json)

### Integration Points
- `createWorkstream()` (`src/workstream/create.ts`): Add `issueNumber?: number` to options, new third path
- `createMeta()` (`src/state/meta.ts`): Already accepts `assignee` param — needs `issueNumber` param too (currently hardcoded to null)
- `assembleContext()` (`src/context/assemble.ts`): Needs to include issue context section when issue.md exists
- `WorkstreamMeta.issueNumber` (`src/state/meta.ts`): Already in schema v3, just needs to be populated
- CLI workstream command (`src/cli/workstream.ts`): Add `--issue` option

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-issue-linked-workstreams*
*Context gathered: 2026-03-13*
