import { join } from 'path';
import { GitOps } from '../git/index.js';
import { readMeta, writeMeta } from '../state/meta.js';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PROTECTED_BRANCHES } from '../constants.js';
import { success, warning } from '../output/index.js';

export interface ArchiveOptions {
  workstreamId: string;
  force?: boolean;
  json?: boolean;
  repoRoot?: string;
}

export interface UnarchiveOptions {
  workstreamId: string;
  json?: boolean;
  repoRoot?: string;
}

export async function archiveHandler(options: ArchiveOptions): Promise<void> {
  const git = new GitOps(options.repoRoot);
  const repoRoot = options.repoRoot ?? (await git.getRepoRoot());
  const metaPath = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR, options.workstreamId, 'meta.json');

  const meta = await readMeta(metaPath);

  if (meta.status === 'archived' && !options.force) {
    throw new Error(`Workstream '${options.workstreamId}' is already archived. Use --force to re-archive.`);
  }

  // Check if branch is merged into any protected branch (skip with --force)
  if (!options.force) {
    let isMerged = false;
    for (const protectedBranch of PROTECTED_BRANCHES) {
      try {
        const merged = await git.isBranchMerged(meta.branch, protectedBranch);
        if (merged) {
          isMerged = true;
          break;
        }
      } catch {
        // Branch may not exist locally, skip
      }
    }

    if (!isMerged) {
      throw new Error(
        `Branch '${meta.branch}' is not merged into any protected branch (${PROTECTED_BRANCHES.join(', ')}). ` +
        `Use --force to archive anyway.`,
      );
    }
  }

  meta.status = 'archived';
  meta.updatedAt = new Date().toISOString();
  await writeMeta(metaPath, meta);

  await git.addAndCommit(
    [metaPath],
    `chore: archive workstream ${options.workstreamId}`,
  );

  success(`Workstream '${options.workstreamId}' archived.`, { json: options.json });
}

export async function unarchiveHandler(options: UnarchiveOptions): Promise<void> {
  const git = new GitOps(options.repoRoot);
  const repoRoot = options.repoRoot ?? (await git.getRepoRoot());
  const metaPath = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR, options.workstreamId, 'meta.json');

  const meta = await readMeta(metaPath);

  if (meta.status === 'active') {
    throw new Error(`Workstream '${options.workstreamId}' is already active.`);
  }

  meta.status = 'active';
  meta.updatedAt = new Date().toISOString();
  await writeMeta(metaPath, meta);

  await git.addAndCommit(
    [metaPath],
    `chore: unarchive workstream ${options.workstreamId}`,
  );

  success(`Workstream '${options.workstreamId}' unarchived.`, { json: options.json });
}
