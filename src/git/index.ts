import simpleGit, { SimpleGit } from 'simple-git';

export class GitOps {
  private git: SimpleGit;

  constructor(cwd?: string) {
    this.git = simpleGit(cwd ? { baseDir: cwd } : undefined);
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branchLocal();
    const current = result.current;
    if (!current || result.detached) {
      throw new Error('HEAD is detached. Check out a branch first.');
    }
    return current;
  }

  async getRepoRoot(): Promise<string> {
    const root = await this.git.revparse(['--show-toplevel']);
    return root.trim();
  }

  async addAndCommit(files: string[], message: string): Promise<void> {
    await this.git.add(files);
    await this.git.commit(message);
  }

  async getHeadHash(): Promise<string> {
    const result = await this.git.revparse(['HEAD']);
    return result.trim();
  }

  async getCommitsBehind(fromHash: string): Promise<number> {
    try {
      const result = await this.git.raw(['rev-list', '--count', fromHash + '..HEAD']);
      return parseInt(result.trim(), 10);
    } catch {
      return -1;
    }
  }

  async getChangedFiles(fromHash: string): Promise<string[]> {
    try {
      const result = await this.git.raw(['diff', '--name-only', fromHash + '..HEAD']);
      return result.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  async getMergeBase(targetBranch: string): Promise<string | null> {
    try {
      const result = await this.git.raw(['merge-base', 'HEAD', targetBranch]);
      return result.trim();
    } catch {
      return null;
    }
  }

  async getDiffNameStatus(fromRef: string): Promise<string> {
    try {
      return await this.git.raw(['diff', '--name-status', fromRef + '..HEAD']);
    } catch {
      return '';
    }
  }

  async getDiffStat(fromRef: string): Promise<string> {
    try {
      return await this.git.raw(['diff', '--stat', fromRef + '..HEAD']);
    } catch {
      return '';
    }
  }

  async getChangedFilesForBranch(branch: string, baseBranch: string): Promise<string[]> {
    try {
      const mergeBase = await this.git.raw(['merge-base', branch, baseBranch]);
      const result = await this.git.raw([
        'diff', '--name-only', mergeBase.trim() + '..' + branch,
      ]);
      return result.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  async isBranchMerged(branch: string, into: string): Promise<boolean> {
    try {
      await this.git.raw(['merge-base', '--is-ancestor', branch, into]);
      return true;
    } catch {
      return false;
    }
  }

  async hasChanges(files: string[]): Promise<boolean> {
    const status = await this.git.status();
    const allChanged = [
      ...status.not_added,
      ...status.modified,
      ...status.created,
      ...status.deleted,
      ...status.staged,
    ];
    return files.some((f) => allChanged.includes(f));
  }
}
