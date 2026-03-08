import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PHASES_DIR } from '../../src/constants.js';

describe('parseAffectedFiles', () => {
  it('extracts file paths from plan.md with "### Affected Files" section', async () => {
    const { parseAffectedFiles } = await import('../../src/phase/drift.js');
    const content = `# Plan

## Task 1

### Affected Files
- \`src/foo.ts\`
- \`src/bar.ts\`

## Task 2
Some other content.
`;
    const result = parseAffectedFiles(content);
    expect(result).toEqual(['src/foo.ts', 'src/bar.ts']);
  });

  it('returns empty array for plan.md with no affected files sections', async () => {
    const { parseAffectedFiles } = await import('../../src/phase/drift.js');
    const content = `# Plan

## Task 1
Just some text, no affected files.

## Task 2
More text.
`;
    const result = parseAffectedFiles(content);
    expect(result).toEqual([]);
  });

  it('handles multiple "### Affected Files" sections and deduplicates', async () => {
    const { parseAffectedFiles } = await import('../../src/phase/drift.js');
    const content = `# Plan

## Task 1

### Affected Files
- \`src/foo.ts\`
- \`src/bar.ts\`

## Task 2

### Affected Files
- \`src/bar.ts\`
- \`src/baz.ts\`
`;
    const result = parseAffectedFiles(content);
    expect(result).toEqual(['src/foo.ts', 'src/bar.ts', 'src/baz.ts']);
  });

  it('handles "## Affected Files" (top-level consolidated section)', async () => {
    const { parseAffectedFiles } = await import('../../src/phase/drift.js');
    const content = `# Plan

## Affected Files
- \`src/alpha.ts\`
- \`src/beta.ts\`

## Other Section
Some content.
`;
    const result = parseAffectedFiles(content);
    expect(result).toEqual(['src/alpha.ts', 'src/beta.ts']);
  });
});

describe('categorizeChanges', () => {
  it('correctly categorizes planned-and-changed, planned-not-changed, changed-not-planned', async () => {
    const { categorizeChanges } = await import('../../src/phase/drift.js');
    const result = categorizeChanges(
      ['src/a.ts', 'src/b.ts', 'src/c.ts'],
      ['src/b.ts', 'src/c.ts', 'src/d.ts'],
    );
    expect(result.plannedAndChanged).toEqual(['src/b.ts', 'src/c.ts']);
    expect(result.plannedNotChanged).toEqual(['src/a.ts']);
    expect(result.changedNotPlanned).toEqual(['src/d.ts']);
  });

  it('with no overlap returns all files in respective categories', async () => {
    const { categorizeChanges } = await import('../../src/phase/drift.js');
    const result = categorizeChanges(
      ['src/a.ts', 'src/b.ts'],
      ['src/c.ts', 'src/d.ts'],
    );
    expect(result.plannedAndChanged).toEqual([]);
    expect(result.plannedNotChanged).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.changedNotPlanned).toEqual(['src/c.ts', 'src/d.ts']);
  });

  it('with full overlap returns all in planned-and-changed', async () => {
    const { categorizeChanges } = await import('../../src/phase/drift.js');
    const result = categorizeChanges(
      ['src/a.ts', 'src/b.ts'],
      ['src/a.ts', 'src/b.ts'],
    );
    expect(result.plannedAndChanged).toEqual(['src/a.ts', 'src/b.ts']);
    expect(result.plannedNotChanged).toEqual([]);
    expect(result.changedNotPlanned).toEqual([]);
  });

  it('with empty planned array returns all actual files as changed-not-planned', async () => {
    const { categorizeChanges } = await import('../../src/phase/drift.js');
    const result = categorizeChanges(
      [],
      ['src/a.ts', 'src/b.ts'],
    );
    expect(result.plannedAndChanged).toEqual([]);
    expect(result.plannedNotChanged).toEqual([]);
    expect(result.changedNotPlanned).toEqual(['src/a.ts', 'src/b.ts']);
  });
});

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  execSync('git commit --allow-empty -m "initial"', { cwd: dir, stdio: 'pipe' });
}

describe('checkDrift', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-drift-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns full DriftResult for valid workstream with plan.md and baseline', async () => {
    initGitRepo(tempDir);
    const baseline = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();

    // Create workstream structure
    const wsId = 'test-ws';
    const phaseDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    // Write state.json with planBaseline
    const stateDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    await writeFile(join(stateDir, 'state.json'), JSON.stringify({
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [{
        number: 1,
        status: 'active',
        discuss: { status: 'complete' },
        plan: { status: 'complete' },
        execute: { status: 'in-progress' },
        planBaseline: baseline,
      }],
    }));

    // Write plan.md
    await writeFile(join(phaseDir, 'plan.md'), `# Plan

### Affected Files
- \`src/foo.ts\`
- \`src/bar.ts\`
`);

    // Add a commit that touches src/foo.ts
    await writeFile(join(tempDir, 'src-foo.ts'), 'content');
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "add foo"', { cwd: tempDir, stdio: 'pipe' });

    const { checkDrift } = await import('../../src/phase/drift.js');
    const result = await checkDrift(tempDir, wsId, 1);

    expect(result.baseline).toBe(baseline);
    expect(result.planned).toEqual(['src/foo.ts', 'src/bar.ts']);
    expect(result.currentHead).toBeTruthy();
  });

  it('throws if no planBaseline exists', async () => {
    initGitRepo(tempDir);
    const wsId = 'test-ws';
    const phaseDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    const stateDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    await writeFile(join(stateDir, 'state.json'), JSON.stringify({
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [{
        number: 1,
        status: 'active',
        discuss: { status: 'complete' },
        plan: { status: 'complete' },
        execute: { status: 'in-progress' },
      }],
    }));

    await writeFile(join(phaseDir, 'plan.md'), '# Plan\n');

    const { checkDrift } = await import('../../src/phase/drift.js');
    await expect(checkDrift(tempDir, wsId, 1)).rejects.toThrow(/baseline/i);
  });

  it('throws if no plan.md exists', async () => {
    initGitRepo(tempDir);
    const wsId = 'test-ws';
    const phaseDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    const stateDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    await writeFile(join(stateDir, 'state.json'), JSON.stringify({
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [{
        number: 1,
        status: 'active',
        discuss: { status: 'complete' },
        plan: { status: 'complete' },
        execute: { status: 'in-progress' },
        planBaseline: 'abc123',
      }],
    }));

    const { checkDrift } = await import('../../src/phase/drift.js');
    await expect(checkDrift(tempDir, wsId, 1)).rejects.toThrow(/plan\.md/i);
  });
});
