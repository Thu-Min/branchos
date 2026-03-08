import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { checkStaleness } from '../../src/map/staleness.js';
import { BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR } from '../../src/constants.js';

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  execSync('git commit --allow-empty -m "initial"', { cwd: dir, stdio: 'pipe' });
}

function makeMapContent(commit: string): string {
  const now = new Date().toISOString();
  return `---
generated: ${now}
commit: ${commit}
generator: test
---

# Architecture

Test content.
`;
}

describe('checkStaleness', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-staleness-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns exists: false when no codebase directory exists', async () => {
    initGitRepo(tempDir);
    const result = await checkStaleness(tempDir);
    expect(result.exists).toBe(false);
    expect(result.commitsBehind).toBe(-1);
    expect(result.isStale).toBe(false);
  });

  it('returns exists: false when codebase dir exists but has no map files', async () => {
    initGitRepo(tempDir);
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    const result = await checkStaleness(tempDir);
    expect(result.exists).toBe(false);
    expect(result.commitsBehind).toBe(-1);
    expect(result.isStale).toBe(false);
  });

  it('returns exists: true, commitsBehind: 0, isStale: false when map is current', async () => {
    initGitRepo(tempDir);
    const headHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), makeMapContent(headHash));

    const result = await checkStaleness(tempDir);
    expect(result.exists).toBe(true);
    expect(result.commitsBehind).toBe(0);
    expect(result.isStale).toBe(false);
    expect(result.mapCommit).toBe(headHash);
    expect(result.headCommit).toBe(headHash);
  });

  it('returns correct commitsBehind when map is behind HEAD', async () => {
    initGitRepo(tempDir);
    const mapHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), makeMapContent(mapHash));

    // Make 3 more commits
    execSync('git commit --allow-empty -m "c2"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "c3"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "c4"', { cwd: tempDir, stdio: 'pipe' });

    const result = await checkStaleness(tempDir);
    expect(result.exists).toBe(true);
    expect(result.commitsBehind).toBe(3);
    // Default threshold is 20, so 3 is not stale
    expect(result.isStale).toBe(false);
  });

  it('reports isStale: true when commits behind >= threshold', async () => {
    initGitRepo(tempDir);
    const mapHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), makeMapContent(mapHash));

    // Make 1 commit, set threshold to 1
    execSync('git commit --allow-empty -m "c2"', { cwd: tempDir, stdio: 'pipe' });

    const result = await checkStaleness(tempDir, 1);
    expect(result.exists).toBe(true);
    expect(result.commitsBehind).toBe(1);
    expect(result.isStale).toBe(true);
  });

  it('reports isStale: true and commitsBehind: -1 when map hash is unknown', async () => {
    initGitRepo(tempDir);
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(
      join(codebaseDir, 'ARCHITECTURE.md'),
      makeMapContent('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'),
    );

    const result = await checkStaleness(tempDir);
    expect(result.exists).toBe(true);
    expect(result.commitsBehind).toBe(-1);
    expect(result.isStale).toBe(true);
  });
});
