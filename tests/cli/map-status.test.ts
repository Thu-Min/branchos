import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
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

describe('map-status handler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-mapstatus-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns not-found result when no map files exist', async () => {
    initGitRepo(tempDir);
    const { mapStatusHandler } = await import('../../src/cli/map-status.js');
    const result = await mapStatusHandler({ json: false, cwd: tempDir });
    expect(result).toEqual(expect.objectContaining({ exists: false }));
  });

  it('returns staleness result when map files exist', async () => {
    initGitRepo(tempDir);
    const headHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), makeMapContent(headHash));

    const { mapStatusHandler } = await import('../../src/cli/map-status.js');
    const result = await mapStatusHandler({ json: false, cwd: tempDir });
    expect(result).toEqual(
      expect.objectContaining({
        exists: true,
        commitsBehind: 0,
        isStale: false,
      }),
    );
  });

  it('returns JSON-compatible result with --json flag', async () => {
    initGitRepo(tempDir);
    const { mapStatusHandler } = await import('../../src/cli/map-status.js');
    const result = await mapStatusHandler({ json: true, cwd: tempDir });
    expect(result).toEqual(expect.objectContaining({ exists: false }));
  });

  it('detects stale map when commits behind exceeds threshold', async () => {
    initGitRepo(tempDir);
    const mapHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), makeMapContent(mapHash));

    // Add commits to exceed default threshold
    execSync('git commit --allow-empty -m "c2"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "c3"', { cwd: tempDir, stdio: 'pipe' });

    // Use threshold of 1 to trigger staleness
    const { mapStatusHandler } = await import('../../src/cli/map-status.js');
    const result = await mapStatusHandler({ json: false, cwd: tempDir, threshold: 1 });
    expect(result).toEqual(
      expect.objectContaining({
        exists: true,
        isStale: true,
      }),
    );
    expect(result.commitsBehind).toBeGreaterThanOrEqual(1);
  });
});
