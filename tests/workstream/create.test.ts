import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { writeFeatureFile } from '../../src/roadmap/feature-file.js';
import type { Feature } from '../../src/roadmap/types.js';

// Mock captureAssignee
vi.mock('../../src/github/index.js', () => ({
  captureAssignee: vi.fn(),
}));

const { captureAssignee } = await import('../../src/github/index.js');
const mockedCaptureAssignee = vi.mocked(captureAssignee);

// Import createWorkstream AFTER setting up mock
const { createWorkstream } = await import('../../src/workstream/create.js');

describe('createWorkstream', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-ws-test-'));
    // Init git repo
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });
    // Create .branchos structure (simulate branchos init)
    await mkdir(join(tempDir, '.branchos', 'workstreams'), { recursive: true });
    await mkdir(join(tempDir, '.branchos', 'shared'), { recursive: true });
    await writeFile(join(tempDir, '.branchos', 'config.json'), '{"schemaVersion":1}\n');
    execSync('git add .branchos/ && git commit -m "init branchos"', { cwd: tempDir });
    // Create a feature branch
    execSync('git checkout -b feature/payment-retry', { cwd: tempDir, stdio: 'pipe' });
    // Default: captureAssignee returns a username
    mockedCaptureAssignee.mockResolvedValue('testuser');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates workstream directory with meta.json and state.json', async () => {
    const result = await createWorkstream({ repoRoot: tempDir });
    expect(result.created).toBe(true);
    expect(result.workstreamId).toBe('payment-retry');

    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', 'payment-retry', 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.workstreamId).toBe('payment-retry');
    expect(meta.branch).toBe('feature/payment-retry');
    expect(meta.schemaVersion).toBe(3);

    const stateRaw = await readFile(join(tempDir, '.branchos', 'workstreams', 'payment-retry', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe(3);
    expect(state.status).toBe('created');
    expect(state.tasks).toEqual([]);
  });

  it('uses nameOverride when provided', async () => {
    const result = await createWorkstream({ repoRoot: tempDir, nameOverride: 'custom-name' });
    expect(result.workstreamId).toBe('custom-name');
    expect(result.created).toBe(true);

    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', 'custom-name', 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.workstreamId).toBe('custom-name');
  });

  it('throws error on protected branch', async () => {
    execSync('git checkout main || git checkout master', { cwd: tempDir, stdio: 'pipe', shell: '/bin/bash' });
    await expect(createWorkstream({ repoRoot: tempDir })).rejects.toThrow('protected branch');
  });

  it('throws error on slug collision', async () => {
    // Create first workstream
    await createWorkstream({ repoRoot: tempDir });
    // Try to create again on same branch
    await expect(createWorkstream({ repoRoot: tempDir })).rejects.toThrow('already exists');
  });

  it('collision error suggests --name', async () => {
    await createWorkstream({ repoRoot: tempDir });
    await expect(createWorkstream({ repoRoot: tempDir })).rejects.toThrow('--name');
  });

  it('throws error when .branchos not initialized', async () => {
    // Remove .branchos
    await rm(join(tempDir, '.branchos'), { recursive: true, force: true });
    execSync('git add -A && git commit -m "remove branchos"', { cwd: tempDir });
    await expect(createWorkstream({ repoRoot: tempDir })).rejects.toThrow('not initialized');
  });

  it('returns correct result shape', async () => {
    const result = await createWorkstream({ repoRoot: tempDir });
    expect(result).toHaveProperty('workstreamId');
    expect(result).toHaveProperty('branch');
    expect(result).toHaveProperty('path');
    expect(result).toHaveProperty('created');
  });

  it('calls captureAssignee and stores result in meta.json', async () => {
    mockedCaptureAssignee.mockResolvedValue('octocat');
    const result = await createWorkstream({ repoRoot: tempDir });
    expect(mockedCaptureAssignee).toHaveBeenCalled();
    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', result.workstreamId, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.assignee).toBe('octocat');
  });

  it('meta.json contains issueNumber as null', async () => {
    const result = await createWorkstream({ repoRoot: tempDir });
    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', result.workstreamId, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.issueNumber).toBeNull();
  });

  it('creates workstream with assignee null when captureAssignee returns null', async () => {
    mockedCaptureAssignee.mockResolvedValue(null);
    const result = await createWorkstream({ repoRoot: tempDir });
    expect(result.created).toBe(true);
    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', result.workstreamId, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.assignee).toBeNull();
  });

  it('propagates error when captureAssignee throws (unauthenticated)', async () => {
    mockedCaptureAssignee.mockRejectedValue(new Error('GitHub CLI is installed but not authenticated. Run `gh auth login` first, then retry.'));
    await expect(createWorkstream({ repoRoot: tempDir })).rejects.toThrow('gh auth login');
  });
});

describe('createWorkstream with featureId', () => {
  let tempDir: string;
  const testFeature: Feature = {
    id: 'F-001',
    title: 'User Auth',
    status: 'unassigned',
    milestone: 'M1',
    branch: 'feature/user-auth',
    issue: null,
    workstream: null,
    body: '## Acceptance Criteria\n- Login works',
    filename: 'F-001-user-auth.md',
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-feat-test-'));
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });
    // Create .branchos structure
    await mkdir(join(tempDir, '.branchos', 'workstreams'), { recursive: true });
    await mkdir(join(tempDir, '.branchos', 'shared', 'features'), { recursive: true });
    await writeFile(join(tempDir, '.branchos', 'config.json'), '{"schemaVersion":1}\n');
    // Write test feature file
    await writeFeatureFile(join(tempDir, '.branchos', 'shared', 'features'), testFeature);
    execSync('git add .branchos/ && git commit -m "init branchos with features"', { cwd: tempDir });
    // Stay on main/master (protected) -- feature flow should create branch from here
    // Default: captureAssignee returns a username
    mockedCaptureAssignee.mockResolvedValue('testuser');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates workstream linked to feature with correct branch', async () => {
    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    expect(result.created).toBe(true);
    expect(result.branch).toBe('feature/user-auth');
    expect(result.featureId).toBe('F-001');
    // workstreamId derived from featureBranch via slugifyBranch
    expect(result.workstreamId).toBe('user-auth');
  });

  it('creates feature branch and checks it out', async () => {
    await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    const currentBranch = execSync('git branch --show-current', { cwd: tempDir }).toString().trim();
    expect(currentBranch).toBe('feature/user-auth');
  });

  it('stores featureId in meta.json', async () => {
    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', result.workstreamId, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.featureId).toBe('F-001');
    expect(meta.branch).toBe('feature/user-auth');
  });

  it('calls captureAssignee and stores result in meta.json for feature-linked flow', async () => {
    mockedCaptureAssignee.mockResolvedValue('featuredev');
    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    expect(mockedCaptureAssignee).toHaveBeenCalled();
    const metaRaw = await readFile(join(tempDir, '.branchos', 'workstreams', result.workstreamId, 'meta.json'), 'utf-8');
    const meta = JSON.parse(metaRaw);
    expect(meta.assignee).toBe('featuredev');
    expect(meta.issueNumber).toBeNull();
  });

  it('updates feature status to in-progress and sets workstream field', async () => {
    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    const featureContent = await readFile(
      join(tempDir, '.branchos', 'shared', 'features', 'F-001-user-auth.md'),
      'utf-8'
    );
    expect(featureContent).toContain('status: in-progress');
    expect(featureContent).toContain(`workstream: ${result.workstreamId}`);
  });

  it('skips protected branch check when featureId provided', async () => {
    // We ARE on main -- should not throw "protected branch" error
    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    expect(result.created).toBe(true);
  });

  it('commits atomically (workstream dir + feature file)', async () => {
    await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    // Verify commit contains both workstream and feature files
    const log = execSync('git log --name-only --format="" -1', { cwd: tempDir }).toString();
    expect(log).toContain('.branchos/workstreams/');
    expect(log).toContain('.branchos/shared/features/');
  });

  it('throws error when feature not found', async () => {
    await expect(
      createWorkstream({ repoRoot: tempDir, featureId: 'F-999' })
    ).rejects.toThrow('F-999');
  });

  it('lists available features when feature not found', async () => {
    await expect(
      createWorkstream({ repoRoot: tempDir, featureId: 'F-999' })
    ).rejects.toThrow('F-001');
  });

  it('throws error when feature already in-progress', async () => {
    // First, update feature to in-progress
    const inProgressFeature = { ...testFeature, status: 'in-progress' as const, workstream: 'existing-ws' };
    await writeFeatureFile(join(tempDir, '.branchos', 'shared', 'features'), inProgressFeature);
    execSync('git add -A && git commit -m "update feature"', { cwd: tempDir });

    await expect(
      createWorkstream({ repoRoot: tempDir, featureId: 'F-001' })
    ).rejects.toThrow('already in-progress');
  });

  it('throws error when no features directory exists', async () => {
    // Remove features directory
    await rm(join(tempDir, '.branchos', 'shared', 'features'), { recursive: true, force: true });
    execSync('git add -A && git commit -m "remove features"', { cwd: tempDir });

    await expect(
      createWorkstream({ repoRoot: tempDir, featureId: 'F-001' })
    ).rejects.toThrow('No features');
  });

  it('uses existing branch when it already exists and user confirms', async () => {
    // Create the branch ahead of time
    execSync('git checkout -b feature/user-auth', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "branch exists"', { cwd: tempDir });
    execSync('git checkout -', { cwd: tempDir, stdio: 'pipe' });

    // Mock promptYesNo to return true
    const promptModule = await import('../../src/workstream/prompt.js');
    const spy = vi.spyOn(promptModule, 'promptYesNo').mockResolvedValue(true);

    const result = await createWorkstream({ repoRoot: tempDir, featureId: 'F-001' });
    expect(result.created).toBe(true);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('aborts when branch exists and user declines', async () => {
    // Create the branch ahead of time
    execSync('git checkout -b feature/user-auth', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "branch exists"', { cwd: tempDir });
    execSync('git checkout -', { cwd: tempDir, stdio: 'pipe' });

    // Mock promptYesNo to return false
    const promptModule = await import('../../src/workstream/prompt.js');
    const spy = vi.spyOn(promptModule, 'promptYesNo').mockResolvedValue(false);

    await expect(
      createWorkstream({ repoRoot: tempDir, featureId: 'F-001' })
    ).rejects.toThrow('Aborted');

    spy.mockRestore();
  });
});
