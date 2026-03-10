# Phase 8: Feature-Aware Workstreams - Research

**Researched:** 2026-03-10
**Domain:** CLI workstream enhancement, context assembly, feature registry integration
**Confidence:** HIGH

## Summary

Phase 8 connects the feature registry (Phase 7) to workstream creation (v1). The implementation touches five existing modules: workstream creation, context assembly, CLI commands, meta state, and feature types. All changes extend existing patterns with no new external dependencies needed.

The core challenge is a multi-step orchestration: validate feature exists and is available, create/checkout branch, create workstream, update feature status, link bidirectionally, and commit atomically. The context assembly extension is straightforward -- add a new optional field to `AssemblyInput` and a new section key to `STEP_SECTIONS`.

**Primary recommendation:** Implement in three plans: (1) core workstream-feature linking with branch handling, (2) context packet integration, (3) archive flow update with feature completion prompt.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- `--feature <id>` auto-creates and checks out the feature branch (e.g., `feature/user-auth` from `featureBranch()`)
- Works from protected branches (main/master/develop) -- creates feature branch from current HEAD
- If feature branch already exists: interactive prompt "Branch feature/<slug> already exists. Use it?"
- Workstream ID derived from branch name (existing `slugifyBranch()` behavior), not from feature ID
- No `--issue` flag -- issue linking deferred to Phase 9
- New dedicated "Feature Context" section in context packets for feature-linked workstreams
- Includes full feature body (title, acceptance criteria, description -- entire markdown content)
- Section appears in all workflow steps (discuss, plan, execute)
- Non-feature workstreams unchanged -- no feature section, no hint about features
- On workstream creation: feature status jumps directly to `in-progress` (skip `assigned`)
- On workstream archive: prompt user "Mark feature F-001 as complete?" -- user decides
- One feature = one workstream (enforced). Large features should be split into multiple feature files
- Bidirectional link: workstream `meta.json` stores `featureId`, feature frontmatter gains `workstream` field
- Non-existent feature: "Feature F-099 not found. Available features: F-001, F-002, F-003. Run /branchos:features to see all."
- Feature already in-progress: "Feature F-001 is already in-progress (workstream: user-auth). One feature = one workstream." -- blocks creation
- No features directory: "No features found. Run /branchos:plan-roadmap first to generate features from your PR-FAQ."

### Claude's Discretion
- Exact prompt wording for branch-exists confirmation and archive-completion prompt
- Feature context section positioning within the context packet
- How to handle `--force` flag interaction with branch-exists prompt
- Commit message format for feature status updates

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WORK-01 | User can create workstream with `--feature <id>` to pre-load feature context and branch name | Extends `createWorkstream()` with `featureId` option, adds branch creation to `GitOps`, extends `WorkstreamMeta` with `featureId`, extends `FeatureFrontmatter` with `workstream` field |
| WORK-02 | Context assembly includes feature description and acceptance criteria for linked workstreams | Extends `AssemblyInput` with `featureContext` field, adds `featureContext` to all `STEP_SECTIONS` entries, adds case in `getSection()`, `contextHandler` reads feature file when workstream has `featureId` |

</phase_requirements>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | existing | CLI option parsing (`--feature <id>`) | Already used for all CLI commands |
| simple-git | existing | Branch creation and checkout | Already used via `GitOps` wrapper |
| vitest | existing | Testing | Already used for all 219 tests |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | existing | Colored CLI output | Error/success messages |
| readline | node built-in | Interactive prompts | Branch-exists and archive-completion prompts |

### No New Dependencies
This phase requires zero new packages. All functionality is achieved by extending existing modules.

## Architecture Patterns

### Recommended Changes by File

```
src/
├── git/index.ts           # Add checkoutBranch(), createBranch() to GitOps
├── workstream/create.ts   # Add featureId option, branch creation flow
├── workstream/archive.ts  # Add feature completion prompt
├── state/meta.ts          # Add optional featureId to WorkstreamMeta
├── roadmap/types.ts       # Add optional workstream to FeatureFrontmatter
├── roadmap/frontmatter.ts # Add workstream to FIELD_ORDER
├── context/assemble.ts    # Add featureContext to AssemblyInput + STEP_SECTIONS
├── cli/workstream.ts      # Add --feature option
├── cli/context.ts         # Read feature file when workstream has featureId
tests/
├── workstream/create.test.ts   # Feature-linked creation tests
├── workstream/archive.test.ts  # Feature completion prompt tests
├── context/assemble.test.ts    # Feature context section tests
├── cli/workstream.test.ts      # CLI integration tests
```

### Pattern 1: Feature-Linked Workstream Creation Flow

**What:** When `--feature <id>` is provided, the creation flow changes significantly from the standard path.
**When to use:** Every `branchos workstream create --feature F-001` invocation.

The flow diverges from standard creation at step 1:

```typescript
// Standard flow: user is already on a feature branch
// Feature flow: user may be on main, we create/checkout the branch

export async function createWorkstream(options: {
  repoRoot: string;
  nameOverride?: string;
  featureId?: string;  // NEW
}): Promise<CreateWorkstreamResult> {
  const { repoRoot, nameOverride, featureId } = options;
  const git = new GitOps(repoRoot);

  if (featureId) {
    // 1. Load feature, validate it exists and is available
    // 2. Generate branch name from feature title via featureBranch()
    // 3. Create/checkout branch (prompt if exists)
    // 4. Create workstream (ID from slugifyBranch(branchName))
    // 5. Write featureId to meta.json
    // 6. Update feature status to 'in-progress' and set workstream field
    // 7. Git commit all changes atomically
  } else {
    // Existing flow unchanged
  }
}
```

**Key insight:** The protected branch check must be SKIPPED when `--feature` is used, because the user IS on a protected branch and we create the feature branch for them.

### Pattern 2: Bidirectional Linking

**What:** Workstream meta stores `featureId`, feature frontmatter stores `workstream` slug.
**When to use:** On creation and on archive.

```typescript
// WorkstreamMeta extension
export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  featureId?: string;  // NEW: optional, e.g. "F-001"
  createdAt: string;
  updatedAt: string;
}

// FeatureFrontmatter extension
export interface FeatureFrontmatter {
  id: string;
  title: string;
  status: FeatureStatus;
  milestone: string;
  branch: string;
  issue: number | null;
  workstream: string | null;  // NEW: e.g. "user-auth"
}
```

### Pattern 3: Context Packet Feature Section

**What:** Add `featureContext` as a new section in context packets for linked workstreams.
**When to use:** All workflow steps when workstream has a linked feature.

```typescript
// AssemblyInput extension
export interface AssemblyInput {
  // ... existing fields ...
  featureContext: string | null;  // NEW: full feature markdown content
}

// STEP_SECTIONS: add 'featureContext' to ALL steps
const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss:  ['featureContext', 'architecture', 'conventions', 'decisions', 'branchDiff'],
  plan:     ['featureContext', 'discuss', 'modules', 'conventions', 'decisions', 'branchDiff'],
  execute:  ['featureContext', 'plan', 'execute', 'branchDiff', 'decisions'],
  fallback: ['featureContext', 'architecture', 'conventions', 'decisions', 'branchDiff', 'hint'],
};
```

**Positioning recommendation:** Place `featureContext` FIRST in each step's section list. The feature's acceptance criteria and description are the most important context -- they define what the workstream is building. This ensures it appears immediately after the header table.

### Anti-Patterns to Avoid
- **Creating a separate feature-workstream module:** Keep logic in `create.ts` -- the feature flow is an extension of creation, not a separate concept.
- **Storing full feature content in meta.json:** Only store `featureId`. Read feature file fresh each time context is assembled -- keeps data in sync.
- **Making featureContext non-null for all workstreams:** Non-feature workstreams must not have ANY feature section (not even an empty one). Check for null and skip entirely.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Branch creation/checkout | Raw git commands via exec | `simple-git` checkout/branch methods via GitOps | Error handling, consistency with existing wrapper |
| Feature file reading | Custom file scanner | Existing `readAllFeatures()` + `readFeatureFile()` | Already handles missing dirs, sorting, parsing |
| YAML frontmatter | External library | Existing `parseFrontmatter()` / `stringifyFrontmatter()` | Hand-rolled parser already works, project pattern |
| Interactive prompts | inquirer/prompts library | Existing `promptYesNo()` in `src/workstream/prompt.ts` | Already used in project, no new dependency |
| Branch slug derivation | Custom slugifier | Existing `slugifyBranch()` from resolve.ts | Already strips prefixes, normalizes correctly |

## Common Pitfalls

### Pitfall 1: Protected Branch Check Conflict
**What goes wrong:** `createWorkstream()` currently throws on protected branches. But `--feature` is designed to work FROM protected branches.
**Why it happens:** The existing guard is unconditional.
**How to avoid:** When `featureId` is provided, skip the protected branch check entirely. The feature branch will be created and checked out before workstream directory creation.
**Warning signs:** Tests that create workstreams with `--feature` from `main` fail with "Cannot create workstream on protected branch."

### Pitfall 2: Git Commit Atomicity
**What goes wrong:** Feature status update and workstream creation are committed separately, leaving inconsistent state on failure.
**Why it happens:** Two separate `addAndCommit()` calls.
**How to avoid:** Collect ALL changed paths (workstream dir + feature file) and commit once at the end of creation.
**Warning signs:** Feature shows `in-progress` but workstream dir does not exist (or vice versa).

### Pitfall 3: Feature Branch Already Exists But Workstream Does Not
**What goes wrong:** User previously created the feature branch manually, it exists but has no workstream. The "branch exists" prompt accepts, but `createWorkstream` then fails because it's already on a non-protected branch and slugifies correctly.
**Why it happens:** This is actually the HAPPY PATH -- user says "yes, use it" and creation proceeds normally.
**How to avoid:** After checkout of existing branch, proceed to workstream creation exactly as if we just created the branch.

### Pitfall 4: Frontmatter Field Order
**What goes wrong:** Adding `workstream` to `FeatureFrontmatter` but forgetting to add it to `FIELD_ORDER` in `frontmatter.ts` causes the field to be silently dropped on write.
**Why it happens:** `stringifyFrontmatter()` iterates `FIELD_ORDER`, not object keys.
**How to avoid:** Add `'workstream'` to the `FIELD_ORDER` array in `frontmatter.ts`. Update type accordingly.
**Warning signs:** Feature file reads back with `workstream: undefined` after write.

### Pitfall 5: Schema Migration for Meta
**What goes wrong:** Existing meta.json files (without `featureId`) cause runtime errors when read.
**Why it happens:** TypeScript type says `featureId` exists but old files don't have it.
**How to avoid:** Make `featureId` optional (`featureId?: string`). No schema migration needed since it's optional and defaults to undefined. Existing `migrateIfNeeded()` will pass through fine.

### Pitfall 6: Context Handler Feature Loading
**What goes wrong:** `contextHandler` in `cli/context.ts` needs to load feature data when a workstream has a linked feature, but it currently has no knowledge of features.
**Why it happens:** Context assembly is separate from feature registry.
**How to avoid:** In `contextHandler`, after loading workstream meta, check `meta.featureId`. If present, read the feature file from `.branchos/shared/features/` and pass its content as `featureContext` to `assembleContext()`.

## Code Examples

### GitOps Branch Methods (to add)

```typescript
// Source: simple-git API
async checkoutBranch(branchName: string, create: boolean = false): Promise<void> {
  if (create) {
    await this.git.checkoutLocalBranch(branchName);
  } else {
    await this.git.checkout(branchName);
  }
}

async branchExists(branchName: string): Promise<boolean> {
  const result = await this.git.branchLocal();
  return result.all.includes(branchName);
}
```

### Feature Validation Helper

```typescript
// In src/workstream/create.ts or a new helper
async function validateFeatureForWorkstream(
  featuresDir: string,
  featureId: string,
): Promise<Feature> {
  const features = await readAllFeatures(featuresDir);

  if (features.length === 0) {
    throw new Error(
      'No features found. Run /branchos:plan-roadmap first to generate features from your PR-FAQ.',
    );
  }

  const feature = features.find((f) => f.id === featureId);
  if (!feature) {
    const ids = features.map((f) => f.id).join(', ');
    throw new Error(
      `Feature ${featureId} not found. Available features: ${ids}. Run /branchos:features to see all.`,
    );
  }

  if (feature.status === 'in-progress') {
    throw new Error(
      `Feature ${featureId} is already in-progress (workstream: ${feature.workstream ?? 'unknown'}). One feature = one workstream.`,
    );
  }

  return feature;
}
```

### Feature Context Section Builder

```typescript
// In src/context/assemble.ts, add to getSection()
case 'featureContext':
  if (input.featureContext) {
    return { name: 'Feature Context', content: input.featureContext };
  }
  // Non-feature workstreams: return empty section that gets filtered
  return null;  // OR handle via a filter step
```

**Note:** Since the current pattern returns a `ContextSection` (never null), an alternative is to check for `featureContext` existence before adding to sections array:

```typescript
// In assembleContext(), modify the loop
for (const key of sectionKeys) {
  if (key === 'featureContext' && !input.featureContext) continue;  // skip for non-feature workstreams
  sections.push(getSection(key, input));
}
```

### Archive Feature Completion

```typescript
// In src/workstream/archive.ts, after successful archive
if (meta.featureId) {
  const confirmed = await promptYesNo(
    `Mark feature ${meta.featureId} as complete? (y/n) `,
  );
  if (confirmed) {
    // Read feature, update status to 'complete', write back
    // Include feature file path in git commit
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Workstreams standalone | Feature-linked workstreams | Phase 8 (now) | Workstreams gain product context |
| Manual branch creation | Auto-branch from feature | Phase 8 (now) | Reduces friction for starting work |
| No feature status tracking | Automatic in-progress on link | Phase 8 (now) | Feature registry stays current |

## Open Questions

1. **Force flag and branch-exists prompt**
   - What we know: `--force` exists on archive. User decision says branch-exists gets a prompt.
   - What's unclear: Should `--force` on `create` also skip the branch-exists prompt?
   - Recommendation: Yes, `--force` should skip the prompt and use the existing branch. This follows the established `--force` pattern in archive.

2. **Feature context formatting**
   - What we know: Full feature body goes into context packet.
   - What's unclear: Should it include frontmatter metadata (status, milestone) or just the markdown body?
   - Recommendation: Include a structured header with id/title/status/milestone/branch, then the full body. This gives the AI agent maximum context about what it's building.

3. **ReadMeta featureId backward compatibility**
   - What we know: `featureId` will be optional on the type.
   - What's unclear: Does schema migration need updating?
   - Recommendation: No migration needed. Optional fields with `undefined` default work fine. The `migrateIfNeeded()` function passes through unknown keys unchanged.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, via package.json) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORK-01a | Create workstream with --feature links feature | unit | `npx vitest run tests/workstream/create.test.ts -t "feature" -x` | Needs update |
| WORK-01b | Feature branch auto-created from protected branch | unit | `npx vitest run tests/workstream/create.test.ts -t "feature branch" -x` | Needs update |
| WORK-01c | Feature status set to in-progress | unit | `npx vitest run tests/workstream/create.test.ts -t "in-progress" -x` | Needs update |
| WORK-01d | Error on non-existent feature | unit | `npx vitest run tests/workstream/create.test.ts -t "not found" -x` | Needs update |
| WORK-01e | Error on feature already in-progress | unit | `npx vitest run tests/workstream/create.test.ts -t "already in-progress" -x` | Needs update |
| WORK-01f | GitOps branch methods | unit | `npx vitest run tests/git/index.test.ts -t "branch" -x` | Needs update |
| WORK-01g | Bidirectional link in meta and frontmatter | unit | `npx vitest run tests/workstream/create.test.ts -t "featureId" -x` | Needs update |
| WORK-02a | Context includes feature section for linked workstreams | unit | `npx vitest run tests/context/assemble.test.ts -t "feature" -x` | Needs update |
| WORK-02b | Context excludes feature section for non-linked | unit | `npx vitest run tests/context/assemble.test.ts -t "non-feature" -x` | Needs update |
| WORK-02c | Feature section in all workflow steps | unit | `npx vitest run tests/context/assemble.test.ts -t "featureContext" -x` | Needs update |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/workstream/create.test.ts tests/context/assemble.test.ts -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/workstream/create.test.ts` -- needs new test cases for feature-linked creation
- [ ] `tests/context/assemble.test.ts` -- needs new test cases for featureContext section
- [ ] `tests/workstream/archive.test.ts` -- needs new test cases for feature completion prompt
- [ ] `tests/git/index.test.ts` -- needs test cases for new `branchExists()` and `checkoutBranch()` methods
- [ ] `tests/roadmap/frontmatter.test.ts` -- needs test for `workstream` field in FIELD_ORDER

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/workstream/create.ts`, `src/context/assemble.ts`, `src/state/meta.ts`, `src/roadmap/types.ts`, `src/roadmap/feature-file.ts`, `src/roadmap/frontmatter.ts`, `src/git/index.ts`, `src/cli/workstream.ts`, `src/cli/context.ts`, `src/workstream/archive.ts`, `src/workstream/prompt.ts`, `src/constants.ts`
- Existing test suite: `tests/workstream/create.test.ts`, `tests/context/assemble.test.ts`
- Phase 8 CONTEXT.md: locked decisions and code context

### Secondary (MEDIUM confidence)
- simple-git API: `checkoutLocalBranch()` and `checkout()` methods (verified via codebase usage patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing code inspected
- Architecture: HIGH - all integration points identified and code read
- Pitfalls: HIGH - derived from actual code analysis (e.g., protected branch guard, FIELD_ORDER, commit atomicity)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable internal codebase, no external dependency concerns)
