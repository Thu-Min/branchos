---
phase: quick-fix
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/cli/index.ts
  - src/roadmap/types.ts
  - src/roadmap/feature-file.ts
  - src/workstream/create.ts
autonomous: true
requirements: [SYNC-REG, FEAT-ASSIGNEE, AUTO-ASSIGN]
must_haves:
  truths:
    - "npx branchos sync-issues runs successfully (command is registered)"
    - "Feature files include assignee field in frontmatter when set"
    - "Creating a workstream with --feature auto-assigns the GitHub issue to the captured assignee"
  artifacts:
    - path: "src/cli/index.ts"
      provides: "sync-issues command registration"
      contains: "registerSyncIssuesCommand"
    - path: "src/roadmap/types.ts"
      provides: "assignee field on FeatureFrontmatter"
      contains: "assignee"
    - path: "src/roadmap/feature-file.ts"
      provides: "assignee read/write in feature frontmatter"
    - path: "src/workstream/create.ts"
      provides: "auto-assign GitHub issue on feature-linked workstream creation"
      contains: "add-assignee"
  key_links:
    - from: "src/cli/index.ts"
      to: "src/cli/sync-issues.ts"
      via: "registerSyncIssuesCommand import and call"
      pattern: "registerSyncIssuesCommand"
    - from: "src/workstream/create.ts"
      to: "ghExec"
      via: "gh issue edit --add-assignee"
      pattern: "add-assignee"
---

<objective>
Fix three concrete issues: register the sync-issues CLI command, add assignee to feature file frontmatter, and auto-assign GitHub issues on workstream creation.

Purpose: Complete the assignee sync pipeline end-to-end.
Output: All three fixes applied and tested.
</objective>

<execution_context>
@/Users/thumin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/thumin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/cli/index.ts
@src/cli/sync-issues.ts
@src/roadmap/types.ts
@src/roadmap/feature-file.ts
@src/workstream/create.ts
@src/github/index.ts

<interfaces>
From src/cli/sync-issues.ts:
```typescript
export function registerSyncIssuesCommand(program: Command): void;
```

From src/roadmap/types.ts:
```typescript
export interface FeatureFrontmatter {
  id: string;
  title: string;
  status: FeatureStatus;
  milestone: string;
  branch: string;
  issue: number | null;
  workstream: string | null;
}
export interface Feature extends FeatureFrontmatter {
  body: string;
  filename: string;
  dependsOn?: string[];
}
```

From src/roadmap/feature-file.ts:
```typescript
export async function writeFeatureFile(dir: string, feature: Feature): Promise<string>;
export async function readFeatureFile(filepath: string): Promise<Feature>;
```

From src/github/index.ts:
```typescript
export async function ghExec(args: string[]): Promise<string>;
export async function captureAssignee(): Promise<string | null>;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Register sync-issues command and add assignee to Feature type</name>
  <files>src/cli/index.ts, src/roadmap/types.ts, src/roadmap/feature-file.ts</files>
  <action>
1. In `src/cli/index.ts`:
   - Add import: `import { registerSyncIssuesCommand } from './sync-issues.js';`
   - Add registration call: `registerSyncIssuesCommand(program);` after the existing `registerCreatePrCommand(program);` line.

2. In `src/roadmap/types.ts`:
   - Add `assignee: string | null;` to the `FeatureFrontmatter` interface (after the `workstream` field).

3. In `src/roadmap/feature-file.ts`:
   - In `writeFeatureFile`, add `assignee: feature.assignee ?? null` to the `stringifyFrontmatter` call object (after the `workstream` line).
   - No changes needed to `readFeatureFile` because it uses spread from `parseFrontmatter` which will pick up the new field automatically.
  </action>
  <verify>
    <automated>npx vitest run tests/roadmap/feature-file.test.ts tests/cli/sync-issues.test.ts --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
    - `npx branchos sync-issues --help` shows the command (not "unknown command").
    - FeatureFrontmatter type includes `assignee: string | null`.
    - writeFeatureFile serializes the assignee field into frontmatter YAML.
  </done>
</task>

<task type="auto">
  <name>Task 2: Auto-assign GitHub issue on feature-linked workstream creation</name>
  <files>src/workstream/create.ts</files>
  <action>
In `createFeatureLinkedWorkstream` function in `src/workstream/create.ts`:

1. Add import for `ghExec` at the top if not already imported:
   `import { ghExec } from '../github/index.js';` (captureAssignee is already imported from there)

2. After the feature file is updated (step 12, the `writeFeatureFile` call around line 233) and BEFORE the atomic commit (step 13):
   - Also write the assignee into `updatedFeature` so it persists in the feature file:
     ```
     updatedFeature.assignee = assignee;
     ```
   - Check if the feature has an issue number (`feature.issue` or the passed `issueNumber`) AND assignee is not null.
   - If both exist, call `ghExec(['issue', 'edit', String(issueNumber ?? feature.issue), '--add-assignee', assignee])` wrapped in try/catch.
   - On failure, log a warning with `console.warn()` but do NOT throw — workstream creation must not fail because of assignee sync (matches Phase 18-02 decision: "Assignee sync failure produces warning but does not abort").

The logic should be:
```typescript
// Auto-assign GitHub issue
const effectiveIssueNumber = issueNumber ?? feature.issue;
if (effectiveIssueNumber && assignee) {
  try {
    await ghExec(['issue', 'edit', String(effectiveIssueNumber), '--add-assignee', assignee]);
  } catch (err: any) {
    console.warn(`Warning: failed to assign issue #${effectiveIssueNumber} to ${assignee}: ${err.message}`);
  }
}
```

Place this AFTER `captureAssignee()` is called and BEFORE the atomic commit.
  </action>
  <verify>
    <automated>npx vitest run tests/workstream/create.test.ts --reporter=verbose 2>&1 | tail -30</automated>
  </verify>
  <done>
    - When `createFeatureLinkedWorkstream` runs with a feature that has an issue number and gh returns a valid assignee, `gh issue edit <N> --add-assignee <login>` is called.
    - When the gh call fails, a warning is logged but workstream creation still succeeds.
    - The assignee is written into the feature file frontmatter.
  </done>
</task>

<task type="auto">
  <name>Task 3: Fix tests and verify build</name>
  <files>tests/roadmap/feature-file.test.ts, tests/workstream/create.test.ts</files>
  <action>
1. Run `npx vitest run` to see which tests break from the new `assignee` field.

2. In `tests/roadmap/feature-file.test.ts`: Update test fixtures/assertions to include the `assignee: null` field in Feature objects and expected frontmatter output. Every Feature object used in tests needs the `assignee` property (since it is now required on the type).

3. In `tests/workstream/create.test.ts`: If there are tests for `createFeatureLinkedWorkstream`, update Feature fixtures to include `assignee`. If tests mock `ghExec`, verify the auto-assign call is tested or add a test case:
   - When feature has issue number and assignee is captured, verify ghExec is called with `['issue', 'edit', '<N>', '--add-assignee', '<login>']`.
   - When ghExec throws, verify the workstream is still created successfully.

4. Run `npx vitest run` — all tests must pass.
5. Run `npx tsc --noEmit` or the project build command to verify type-checking passes.
  </action>
  <verify>
    <automated>npx vitest run --reporter=verbose 2>&1 | tail -40 && npx tsup 2>&1 | tail -5</automated>
  </verify>
  <done>
    - All existing tests pass (no regressions).
    - TypeScript compilation succeeds with no errors.
    - New assignee field is covered in feature-file tests.
  </done>
</task>

</tasks>

<verification>
1. `npx branchos sync-issues --help` outputs usage (command registered)
2. `npx vitest run` — all tests pass
3. `npx tsup` — build succeeds
</verification>

<success_criteria>
- sync-issues command is registered and callable via `npx branchos sync-issues`
- Feature type includes assignee field, feature files serialize it
- Feature-linked workstream creation auto-assigns the GitHub issue
- All tests pass, build succeeds
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-sync-issues-registration-add-assigne/1-SUMMARY.md`
</output>
