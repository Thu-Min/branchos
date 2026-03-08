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

  describe('getHeadHash', () => {
    it('returns the current HEAD commit hash', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });

      const git = new GitOps(tempDir);
      const hash = await git.getHeadHash();
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
      // Verify it matches what git rev-parse says
      const expected = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();
      expect(hash).toBe(expected);
    });
  });

  describe('getCommitsBehind', () => {
    it('returns 0 when given HEAD hash itself', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });

      const git = new GitOps(tempDir);
      const headHash = await git.getHeadHash();
      const behind = await git.getCommitsBehind(headHash);
      expect(behind).toBe(0);
    });

    it('returns count of commits between ancestor and HEAD', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "first"', { cwd: tempDir });

      const ancestorHash = execSync('git rev-parse HEAD', { cwd: tempDir }).toString().trim();

      execSync('git commit --allow-empty -m "second"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "third"', { cwd: tempDir });

      const git = new GitOps(tempDir);
      const behind = await git.getCommitsBehind(ancestorHash);
      expect(behind).toBe(2);
    });

    it('returns -1 for nonexistent hash (rebase scenario)', async () => {
      execSync('git init', { cwd: tempDir });
      execSync('git config user.email "test@test.com"', { cwd: tempDir });
      execSync('git config user.name "Test"', { cwd: tempDir });
      execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });

      const git = new GitOps(tempDir);
      const behind = await git.getCommitsBehind('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
      expect(behind).toBe(-1);
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
