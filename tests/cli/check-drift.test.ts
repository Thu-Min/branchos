import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { Command } from 'commander';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PHASES_DIR } from '../../src/constants.js';

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  execSync('git commit --allow-empty -m "initial"', { cwd: dir, stdio: 'pipe' });
}

function setupWorkstream(dir: string, wsId: string, baseline: string): string {
  const wsDir = join(dir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
  return wsDir;
}

describe('checkDriftHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-checkdrift-cli-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns DriftResult with correct categories', async () => {
    initGitRepo(tempDir);
    const baseline = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();

    // Setup workstream with meta.json pointing to current branch
    const branch = execSync('git branch --show-current', { cwd: tempDir }).toString().trim();
    const wsId = 'test-ws';
    const wsDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    const phaseDir = join(wsDir, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    await writeFile(join(wsDir, 'meta.json'), JSON.stringify({ branch }));
    await writeFile(join(wsDir, 'state.json'), JSON.stringify({
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

    await writeFile(join(phaseDir, 'plan.md'), `# Plan

### Affected Files
- \`src/foo.ts\`
- \`src/bar.ts\`
`);

    // Make a change that touches one planned file name (in diff)
    await mkdir(join(tempDir, 'src'), { recursive: true });
    await writeFile(join(tempDir, 'src', 'foo.ts'), 'content');
    await writeFile(join(tempDir, 'src', 'extra.ts'), 'content');
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "changes"', { cwd: tempDir, stdio: 'pipe' });

    const { checkDriftHandler } = await import('../../src/cli/check-drift.js');
    const result = await checkDriftHandler({ json: false, cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.plannedAndChanged).toContain('src/foo.ts');
    expect(result!.plannedNotChanged).toContain('src/bar.ts');
    expect(result!.changedNotPlanned).toContain('src/extra.ts');
  });

  it('with --json flag outputs valid JSON structure', async () => {
    initGitRepo(tempDir);
    const baseline = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();

    const branch = execSync('git branch --show-current', { cwd: tempDir }).toString().trim();
    const wsId = 'test-ws';
    const wsDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    const phaseDir = join(wsDir, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    await writeFile(join(wsDir, 'meta.json'), JSON.stringify({ branch }));
    await writeFile(join(wsDir, 'state.json'), JSON.stringify({
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

    await writeFile(join(phaseDir, 'plan.md'), `# Plan

### Affected Files
- \`src/a.ts\`
`);

    const { checkDriftHandler } = await import('../../src/cli/check-drift.js');
    const result = await checkDriftHandler({ json: true, cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('baseline');
    expect(result).toHaveProperty('currentHead');
    expect(result).toHaveProperty('planned');
    expect(result).toHaveProperty('actual');
    expect(result).toHaveProperty('plannedAndChanged');
    expect(result).toHaveProperty('plannedNotChanged');
    expect(result).toHaveProperty('changedNotPlanned');
  });

  it('with no workstream returns null', async () => {
    initGitRepo(tempDir);

    // No workstream setup at all
    const { checkDriftHandler } = await import('../../src/cli/check-drift.js');
    const result = await checkDriftHandler({ json: false, cwd: tempDir });
    expect(result).toBeNull();
  });

  it('with no plan baseline returns null and prints message', async () => {
    initGitRepo(tempDir);

    const branch = execSync('git branch --show-current', { cwd: tempDir }).toString().trim();
    const wsId = 'test-ws';
    const wsDir = join(tempDir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
    const phaseDir = join(wsDir, PHASES_DIR, '1');
    await mkdir(phaseDir, { recursive: true });

    await writeFile(join(wsDir, 'meta.json'), JSON.stringify({ branch }));
    await writeFile(join(wsDir, 'state.json'), JSON.stringify({
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
        // No planBaseline
      }],
    }));

    await writeFile(join(phaseDir, 'plan.md'), '# Plan\n');

    const { checkDriftHandler } = await import('../../src/cli/check-drift.js');
    const result = await checkDriftHandler({ json: false, cwd: tempDir });
    expect(result).toBeNull();
  });
});

describe('registerCheckDriftCommand', () => {
  it('registers "check-drift" command on program', async () => {
    const { registerCheckDriftCommand } = await import('../../src/cli/check-drift.js');
    const program = new Command();
    registerCheckDriftCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'check-drift');
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain('drift');
  });
});
