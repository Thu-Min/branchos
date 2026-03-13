# Phase 16: Assignee Capture & Schema Migration - Research

**Researched:** 2026-03-13
**Domain:** GitHub CLI integration, JSON schema migration, TypeScript interfaces
**Confidence:** HIGH

## Summary

This phase adds automatic GitHub username capture during workstream creation and migrates the meta.json schema from v2 to v3. The codebase already has well-established patterns for both concerns: `ghExec`/`checkGhAvailable` for GitHub CLI interaction, and the `migrations` array + `migrateIfNeeded` for schema evolution. The implementation is straightforward extension of existing patterns with no new dependencies.

The primary technical challenge is the tiered fallback logic (gh missing vs gh unauthenticated), which requires different behavior per failure mode. The existing `checkGhAvailable()` already distinguishes these cases, making the `captureAssignee()` function a thin wrapper that applies business logic on top of existing infrastructure.

**Primary recommendation:** Extend existing patterns -- add v2-to-v3 migration to `migrations` array, add `captureAssignee()` to `src/github/index.ts`, update `WorkstreamMeta` interface and `createMeta()` signature, then wire into both `createWorkstream` paths.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Eager capture: call `gh api /user` during create-workstream, store result immediately
- New `captureAssignee()` helper function in `src/github/index.ts` alongside existing ghExec/checkGhAvailable
- Extract only the `login` field from the API response -- no display name or other fields
- Both create-workstream paths (standard + feature-linked) call captureAssignee
- Tiered fallback: gh not installed = suggest installing + null assignee (non-blocking); gh installed but not authenticated = error out blocking workstream creation; gh installed + authenticated = capture normally
- v2-to-v3 migration adds `assignee` and `issueNumber` fields
- Existing workstreams get null for both fields (no backfill)
- `issueNumber` defaults to null -- issue-linked workstreams don't exist yet (Phase 17)
- Migration persists on next write, not on read (matches existing behavior)
- Top-level fields: `assignee: string | null` and `issueNumber: number | null`
- Always present in v3 schema (not optional/undefined -- explicit null for "not set")
- `featureId` stays as-is (`featureId?: string`) -- no retroactive alignment

### Claude's Discretion
- Error message wording for gh-not-installed vs gh-not-authed cases
- Whether captureAssignee uses checkGhAvailable internally or does its own detection
- Test structure and mock patterns for gh CLI calls

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ASN-01 | GitHub username auto-captured via `gh api /user` on workstream creation | `captureAssignee()` calls `ghExec(['api', '/user'])`, parses JSON, extracts `login` field |
| ASN-02 | Username stored in workstream meta.json as `assignee` field | `WorkstreamMeta` interface updated with `assignee: string \| null`, `createMeta()` accepts assignee param |
| ASN-04 | Assignee capture is non-blocking -- graceful fallback if `gh` unavailable | Tiered fallback via `checkGhAvailable()` -- null when gh missing, error when unauthenticated |
| ASN-05 | Schema migration v2-to-v3 for new meta.json fields (assignee, issueNumber) | New migration entry in `migrations` array, sets both fields to null for existing data |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | (existing) | Test runner | Already used across 48 test files |
| child_process (execFile) | Node built-in | gh CLI execution | Existing pattern, security decision (no shell injection) |

### Supporting
No new dependencies required. This phase extends existing code only.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Code to Extend

```
src/
  github/
    index.ts          # Add captureAssignee() here (alongside ghExec, checkGhAvailable)
  state/
    schema.ts         # Add v2->v3 migration, bump CURRENT_SCHEMA_VERSION to 3
    meta.ts           # Update WorkstreamMeta interface, update createMeta() signature
  workstream/
    create.ts         # Wire captureAssignee() into both creation paths
```

### Pattern 1: captureAssignee() Function

**What:** Async function returning `string | null` that handles all gh CLI detection + API call logic.
**When to use:** Called from createWorkstream before createMeta.

```typescript
// Recommended approach: leverage existing checkGhAvailable
export async function captureAssignee(): Promise<string | null> {
  const { available, authenticated } = await checkGhAvailable();

  if (!available) {
    // gh not installed -- non-blocking, suggest installing
    console.warn('GitHub CLI (gh) not found. Install it to enable assignee tracking.');
    return null;
  }

  if (!authenticated) {
    // gh installed but not authenticated -- BLOCKING
    throw new Error(
      'GitHub CLI is installed but not authenticated. Run `gh auth login` first, then retry.'
    );
  }

  // gh available + authenticated -- capture username
  const raw = await ghExec(['api', '/user']);
  const user = JSON.parse(raw);
  return user.login;
}
```

**Key detail:** `gh api /user` returns JSON with a `login` field containing the GitHub username. The response is a full user object but we only extract `login`.

### Pattern 2: Schema Migration v2 to v3

**What:** Add migration entry to existing `migrations` array.
**Follows:** Exact same pattern as v0-to-v1 and v1-to-v2 migrations.

```typescript
// Add to migrations array in src/state/schema.ts
{
  fromVersion: 2,
  migrate: (data) => ({
    ...data,
    schemaVersion: 3,
    assignee: null,
    issueNumber: null,
  }),
}
```

**Important:** The existing `migrateIfNeeded` function runs migrations sequentially (matching `fromVersion`), then stamps `CURRENT_SCHEMA_VERSION` at the end. The v2-to-v3 migration adds both new fields with null defaults.

### Pattern 3: WorkstreamMeta Interface Update

```typescript
export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  featureId?: string;       // stays optional (existing pattern)
  assignee: string | null;   // NEW: explicit null, not optional
  issueNumber: number | null; // NEW: explicit null, not optional
}
```

### Pattern 4: createMeta Signature Update

```typescript
export function createMeta(
  workstreamId: string,
  branch: string,
  featureId?: string,
  assignee?: string | null,  // Add as optional param with default
): WorkstreamMeta {
  // ...existing code...
  // assignee: assignee ?? null,
  // issueNumber: null,  // Always null at creation (Phase 17 adds issue linking)
}
```

**Design choice:** `assignee` parameter is optional with null default so existing callers (tests, etc.) don't break. `issueNumber` is always null at creation time.

### Pattern 5: createWorkstream Integration

Both paths in `create.ts` need the same pattern:

```typescript
// Before createMeta call:
const assignee = await captureAssignee();
// Then pass to createMeta:
const meta = createMeta(workstreamId, branch, undefined, assignee);
// or for feature-linked:
const meta = createMeta(workstreamId, branchName, featureId, assignee);
```

### Anti-Patterns to Avoid
- **Optional fields for assignee/issueNumber:** Decision is explicit null, not `undefined`/optional. This distinguishes "not set" from "field doesn't exist."
- **Backfilling assignees during migration:** Decision explicitly says null for existing workstreams, no backfill.
- **Persisting migration on read:** Existing pattern is migrate-on-read, persist-on-next-write. Don't add write side effects to `readMeta`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| gh CLI detection | Custom PATH scanning | `checkGhAvailable()` | Already handles version check + auth status |
| JSON schema migration | Custom file scanning + updates | `migrateIfNeeded()` + `migrations` array | Proven pattern with 2 existing migrations |
| GitHub API calls | fetch/axios HTTP calls | `ghExec(['api', '/user'])` | gh CLI handles auth tokens, no token management needed |

## Common Pitfalls

### Pitfall 1: Migration Not Applied to State Files
**What goes wrong:** `state.json` also uses `migrateIfNeeded` -- need to ensure the v2-to-v3 migration doesn't corrupt state files by adding `assignee`/`issueNumber` fields to them.
**Why it happens:** The migration function is generic -- it runs on any data with `schemaVersion`.
**How to avoid:** The migration adds fields with null values. State files will get these extra fields but they're harmless -- `state.json` uses a different type (`WorkstreamState`) and the extra fields are simply ignored. This matches the existing pattern where v1-to-v2 added `currentPhase`/`phases` to all migrated data.
**Warning signs:** State file reads failing or losing data after migration.

### Pitfall 2: createMeta Parameter Order
**What goes wrong:** Adding `assignee` parameter breaks existing callers that pass positional args.
**Why it happens:** `createMeta(id, branch, featureId?)` has featureId as optional 3rd param.
**How to avoid:** Add `assignee` as 4th parameter (also optional, defaults to null). All existing callers pass 2 or 3 args and continue to work. Alternative: use an options object, but that's a larger refactor.
**Warning signs:** TypeScript compilation errors in test files and create.ts.

### Pitfall 3: gh api /user JSON Parsing Failure
**What goes wrong:** `ghExec` returns raw string, not parsed JSON. If the response format is unexpected, `JSON.parse` throws.
**Why it happens:** Network issues, gh CLI version differences, or API changes.
**How to avoid:** Wrap JSON.parse in try-catch within `captureAssignee`. If parse fails, treat as capture failure (return null with warning, or throw depending on context -- since gh is available and authenticated, this is unexpected and should probably throw).

### Pitfall 4: Test Schema Version Assertions
**What goes wrong:** Existing tests assert `CURRENT_SCHEMA_VERSION === 2` and `meta.schemaVersion === 2`.
**Why it happens:** Tests were written for v2 schema.
**How to avoid:** Update all test assertions from `2` to `3`. Search for `schemaVersion.*2` and `toBe(2)` in test files.

### Pitfall 5: createWorkstream Tests Use Real Git
**What goes wrong:** Integration tests for createWorkstream use real temp dirs with git init. Adding captureAssignee (which calls gh CLI) would fail in CI/test environments.
**Why it happens:** The create.test.ts tests are integration-style with real filesystem.
**How to avoid:** Mock `captureAssignee` in createWorkstream tests (vi.mock the github module). Unit test `captureAssignee` separately with the existing `child_process` mock pattern from `tests/github/index.test.ts`.

## Code Examples

### gh api /user Response Shape
```json
{
  "login": "octocat",
  "id": 1,
  "node_id": "MDQ6VXNlcjE=",
  "avatar_url": "https://github.com/images/error/octocat_happy.gif",
  "type": "User",
  "name": "monalisa octocat",
  "company": "GitHub",
  "email": "octocat@github.com"
}
```
Only `login` is extracted per the locked decision.

### Existing Mock Pattern for gh CLI Tests
```typescript
// From tests/github/index.test.ts -- reuse this exact pattern
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const { execFile } = await import('child_process');
const mockedExecFile = vi.mocked(execFile);

function mockExecFileSuccess(stdout: string, stderr = '') {
  mockedExecFile.mockImplementation(
    ((_file: string, _args: any, callback: any) => {
      if (typeof _args === 'function') {
        callback = _args;
        _args = [];
      }
      callback(null, stdout, stderr);
    }) as any,
  );
}
```

### Existing Migration Pattern
```typescript
// From src/state/schema.ts -- follow this exact structure
{
  fromVersion: 1,
  migrate: (data) => ({
    ...data,
    schemaVersion: 2,
    currentPhase: 0,
    phases: [],
  }),
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No assignee tracking | Auto-capture via gh CLI | Phase 16 (this phase) | Enables PR auto-assignment (Phase 18) |
| Schema v2 (phases/currentPhase) | Schema v3 (+ assignee/issueNumber) | Phase 16 (this phase) | Foundation for issue linking (Phase 17) |

## Open Questions

1. **createWorkstream test refactoring scope**
   - What we know: create.test.ts is integration-style with real git. Adding captureAssignee requires mocking.
   - What's unclear: Whether to mock at the module level (vi.mock github/index) or inject captureAssignee as a dependency.
   - Recommendation: Use vi.mock -- it's the established pattern in this codebase (see github/index.test.ts). Dependency injection would be a larger refactor.

2. **Console.warn for gh-not-installed message**
   - What we know: The function should warn the user when gh is not installed.
   - What's unclear: Whether to use console.warn directly or return a result object with warnings.
   - Recommendation: Use console.warn directly for simplicity. The CLI already uses console for output. If structured output is needed later, refactor then.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, from package.json) |
| Config file | vitest uses package.json `scripts.test` = `vitest run` |
| Quick run command | `npx vitest run tests/state/schema.test.ts tests/state/meta.test.ts tests/github/index.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASN-01 | captureAssignee calls gh api /user and returns login | unit | `npx vitest run tests/github/index.test.ts -t "captureAssignee"` | Needs new tests |
| ASN-02 | createMeta includes assignee field in output | unit | `npx vitest run tests/state/meta.test.ts -t "assignee"` | Needs new tests |
| ASN-04 | captureAssignee returns null when gh unavailable, throws when unauthenticated | unit | `npx vitest run tests/github/index.test.ts -t "captureAssignee"` | Needs new tests |
| ASN-05 | v2-to-v3 migration adds assignee and issueNumber as null | unit | `npx vitest run tests/state/schema.test.ts -t "v2 to v3"` | Needs new tests |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/state/schema.test.ts tests/state/meta.test.ts tests/github/index.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/github/index.test.ts` -- add `captureAssignee` describe block (covers ASN-01, ASN-04)
- [ ] `tests/state/meta.test.ts` -- add tests for assignee and issueNumber in createMeta output (covers ASN-02)
- [ ] `tests/state/schema.test.ts` -- add v2-to-v3 migration tests (covers ASN-05)
- [ ] `tests/workstream/create.test.ts` -- add mock for captureAssignee in integration tests (covers ASN-01 integration)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/github/index.ts` -- existing ghExec, checkGhAvailable patterns
- Codebase inspection: `src/state/schema.ts` -- existing migration chain pattern
- Codebase inspection: `src/state/meta.ts` -- existing WorkstreamMeta interface and createMeta
- Codebase inspection: `src/workstream/create.ts` -- both creation paths
- Codebase inspection: `tests/github/index.test.ts` -- mock patterns for child_process/execFile
- Codebase inspection: `tests/state/schema.test.ts` -- migration test patterns

### Secondary (MEDIUM confidence)
- GitHub REST API docs: `/user` endpoint returns JSON with `login` field (well-established, stable API)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, extending existing code
- Architecture: HIGH - all patterns directly observed in codebase
- Pitfalls: HIGH - identified from actual test files and code structure

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable -- internal codebase patterns, not external APIs)
