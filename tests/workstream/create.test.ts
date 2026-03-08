import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWorkstream } from '../../src/workstream/create.js';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

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
    expect(meta.schemaVersion).toBe(2);

    const stateRaw = await readFile(join(tempDir, '.branchos', 'workstreams', 'payment-retry', 'state.json'), 'utf-8');
    const state = JSON.parse(stateRaw);
    expect(state.schemaVersion).toBe(2);
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
});
