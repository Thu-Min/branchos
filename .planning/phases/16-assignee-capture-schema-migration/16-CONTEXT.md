# Phase 16: Assignee Capture & Schema Migration - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatic GitHub username capture on workstream creation with schema v2→v3 migration. When a developer runs `create-workstream`, their GitHub username is captured into workstream metadata. Existing workstreams migrate cleanly to schema v3 with null defaults. Assignee sync to GitHub Issues is Phase 18 scope.

</domain>

<decisions>
## Implementation Decisions

### Username Capture
- Eager capture: call `gh api /user` during create-workstream, store result immediately
- New `captureAssignee()` helper function in `src/github/index.ts` alongside existing ghExec/checkGhAvailable
- Extract only the `login` field from the API response — no display name or other fields
- Both create-workstream paths (standard + feature-linked) call captureAssignee

### Fallback Behavior
- Tiered fallback based on failure mode:
  - **gh not installed**: suggest installing gh CLI, create workstream with null assignee (non-blocking)
  - **gh installed but not authenticated**: error out with "Run `gh auth login` first, then retry" — blocks workstream creation
  - **gh installed + authenticated**: capture username normally
- Rationale: if gh is installed, the developer intends to use GitHub features — authentication should be required

### Schema Migration
- v2→v3 migration adds `assignee` and `issueNumber` fields
- Existing workstreams get null for both fields (no backfill attempts)
- `issueNumber` defaults to null — issue-linked workstreams don't exist yet (Phase 17)
- Migration persists on next write, not on read (matches existing migration behavior — no I/O side effects in readMeta)

### Meta.json Shape
- Top-level fields: `assignee: string | null` and `issueNumber: number | null`
- Always present in v3 schema (not optional/undefined — explicit null for "not set")
- `featureId` stays as-is (`featureId?: string`) — no retroactive alignment

### Claude's Discretion
- Error message wording for gh-not-installed vs gh-not-authed cases
- Whether captureAssignee uses checkGhAvailable internally or does its own detection
- Test structure and mock patterns for gh CLI calls

</decisions>

<specifics>
## Specific Ideas

- The blocking behavior on unauthenticated gh is deliberate: if a developer has gh installed, they should be authenticated to use BranchOS's GitHub features properly
- captureAssignee should be a clean, testable function that returns `string | null` — createWorkstream passes the result to createMeta

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ghExec(args)` (`src/github/index.ts`): execFile wrapper for gh CLI — captureAssignee will use this to call `gh api /user`
- `checkGhAvailable()` (`src/github/index.ts`): returns `{available, authenticated}` — can inform the tiered fallback logic
- `migrateIfNeeded()` (`src/state/schema.ts`): chained migration system — add v2→v3 migration to `migrations` array

### Established Patterns
- Hand-rolled migrations with no external deps (v0→v1→v2 pattern)
- `execFile` over `exec` for gh CLI calls (security decision)
- Pure functions for data assembly, I/O at the edges

### Integration Points
- `createMeta()` (`src/state/meta.ts`): needs `assignee` parameter, adds to WorkstreamMeta type
- `createWorkstream()` (`src/workstream/create.ts`): both standard and feature-linked paths call captureAssignee before createMeta
- `CURRENT_SCHEMA_VERSION` (`src/state/schema.ts`): bump from 2 to 3
- `WorkstreamMeta` interface (`src/state/meta.ts`): add assignee and issueNumber fields

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-assignee-capture-schema-migration*
*Context gathered: 2026-03-13*
