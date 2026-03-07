import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitOps } from '../../src/git/index.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('GitOps', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('isGitRepo', () => {
    it('returns true inside a git repo', async () => {
      execSync('git init', { cwd: tempDir });
      const git = new GitOps(tempDir);
      expect(await git.isGitRepo()).toBe(true);
    });

    it('returns false outside a git repo', async () => {
      const git = new GitOps(tempDir);
      expect(await git.isGitRepo()).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('returns the current branch name', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });
      const git = new GitOps(tempDir);
      const branch = await git.getCurrentBranch();
      // Default branch could be main or master depending on git config
      expect(['main', 'master']).toContain(branch);
    });

    it('throws on detached HEAD', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "first"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "second"', { cwd: tempDir });
      execSync('git checkout HEAD~1', { cwd: tempDir, stdio: 'pipe' });

      const git = new GitOps(tempDir);
      await expect(git.getCurrentBranch()).rejects.toThrow('detached');
    });
  });

  describe('getRepoRoot', () => {
    it('returns the absolute path to repo root', async () => {
      execSync('git init', { cwd: tempDir });
      const git = new GitOps(tempDir);
      const root = await git.getRepoRoot();
      // Resolve symlinks (macOS /tmp -> /private/tmp)
      const { realpathSync } = await import('fs');
      expect(realpathSync(root)).toBe(realpathSync(tempDir));
    });
  });

  describe('addAndCommit', () => {
    it('stages and commits files', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      // Create a file to commit
      const { writeFileSync } = await import('fs');
      writeFileSync(join(tempDir, 'test.txt'), 'hello');

      const git = new GitOps(tempDir);
      await git.addAndCommit(['test.txt'], 'test commit');

      const log = execSync('git log --oneline', { cwd: tempDir }).toString();
      expect(log).toContain('test commit');
    });
  });

  describe('hasChanges', () => {
    it('returns true when files have changes', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });

      const { writeFileSync } = await import('fs');
      writeFileSync(join(tempDir, 'new.txt'), 'content');

      const git = new GitOps(tempDir);
      expect(await git.hasChanges(['new.txt'])).toBe(true);
    });

    it('returns false when no changes', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });

      const git = new GitOps(tempDir);
      expect(await git.hasChanges(['nonexistent.txt'])).toBe(false);
    });
  });
});
