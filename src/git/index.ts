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
