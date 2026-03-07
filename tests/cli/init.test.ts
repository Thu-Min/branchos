import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// We test by importing the init handler logic directly
// and also by running the built CLI as integration tests

describe('branchos init', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-init-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function initGitRepo(dir: string): void {
    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
    execSync('git commit --allow-empty -m "initial"', { cwd: dir, stdio: 'pipe' });
  }

  describe('initHandler', () => {
    it('creates .branchos/shared/ directory', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const s = await stat(join(tempDir, '.branchos', 'shared'));
      expect(s.isDirectory()).toBe(true);
    });

    it('creates .branchos/workstreams/ directory', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const s = await stat(join(tempDir, '.branchos', 'workstreams'));
      expect(s.isDirectory()).toBe(true);
    });

    it('creates .branchos/config.json with schemaVersion 1', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const configPath = join(tempDir, '.branchos', 'config.json');
      const content = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(content.schemaVersion).toBe(1);
    });

    it('adds .branchos-runtime/ to .gitignore', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.branchos-runtime/');
    });

    it('auto-commits with "chore: initialize branchos" message', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const log = execSync('git log --oneline', { cwd: tempDir }).toString();
      expect(log).toContain('chore: initialize branchos');
    });

    it('is idempotent - second run does not create duplicate commit', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      const logBefore = execSync('git log --oneline', { cwd: tempDir }).toString();
      const commitCountBefore = logBefore.trim().split('\n').length;

      await initHandler({ json: false, cwd: tempDir });
      const logAfter = execSync('git log --oneline', { cwd: tempDir }).toString();
      const commitCountAfter = logAfter.trim().split('\n').length;

      expect(commitCountAfter).toBe(commitCountBefore);
    });

    it('errors outside a git repo', async () => {
      const { initHandler } = await import('../../src/cli/init.js');
      const result = await initHandler({ json: false, cwd: tempDir });
      expect(result).toEqual({ success: false, error: expect.stringContaining('Not a git repository') });
    });

    it('supports --json output', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      const result = await initHandler({ json: true, cwd: tempDir });
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });

    it('preserves existing .gitignore content', async () => {
      initGitRepo(tempDir);
      const { writeFile } = await import('fs/promises');
      await writeFile(join(tempDir, '.gitignore'), 'node_modules/\n');

      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });

      const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('node_modules/');
      expect(gitignore).toContain('.branchos-runtime/');
    });

    it('does not duplicate .branchos-runtime/ in .gitignore on re-init', async () => {
      initGitRepo(tempDir);
      const { initHandler } = await import('../../src/cli/init.js');
      await initHandler({ json: false, cwd: tempDir });
      await initHandler({ json: false, cwd: tempDir });

      const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
      const matches = gitignore.match(/\.branchos-runtime\//g);
      expect(matches?.length).toBe(1);
    });
  });
});
