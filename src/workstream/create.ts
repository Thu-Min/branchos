import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, WORKSTREAMS_DIR } from '../constants.js';
import { slugifyBranch, isProtectedBranch } from './resolve.js';
import { discoverWorkstreams } from './discover.js';
import { createMeta, writeMeta } from '../state/meta.js';
import { createInitialState, writeState } from '../state/state.js';

export interface CreateWorkstreamResult {
  workstreamId: string;
  branch: string;
  path: string;
  created: boolean;
}

export async function createWorkstream(options: {
  repoRoot: string;
  nameOverride?: string;
}): Promise<CreateWorkstreamResult> {
  const { repoRoot, nameOverride } = options;
  const git = new GitOps(repoRoot);

  // Get current branch
  const branch = await git.getCurrentBranch();

  // Check protected branch
  if (isProtectedBranch(branch)) {
    throw new Error(
      `Cannot create workstream on protected branch '${branch}'. Switch to a feature branch first.`,
    );
  }

  // Derive workstream ID
  const workstreamId = nameOverride || slugifyBranch(branch);

  if (!workstreamId) {
    throw new Error(
      'Could not derive workstream ID from branch name. Use --name <custom-name> to specify one.',
    );
  }

  // Check .branchos/ exists
  const branchosPath = join(repoRoot, BRANCHOS_DIR);
  try {
    await access(branchosPath);
  } catch {
    throw new Error(
      'BranchOS not initialized. Run `branchos init` first.',
    );
  }

  // Check for collision
  const workstreamsDir = join(branchosPath, WORKSTREAMS_DIR);
  const existing = await discoverWorkstreams(workstreamsDir);
  if (existing.includes(workstreamId)) {
    throw new Error(
      `Workstream '${workstreamId}' already exists. Use --name <custom-name> to specify a different ID.`,
    );
  }

  // Create workstream directory
  const wsPath = join(workstreamsDir, workstreamId);
  await mkdir(wsPath, { recursive: true });

  // Write meta.json
  const meta = createMeta(workstreamId, branch);
  await writeMeta(join(wsPath, 'meta.json'), meta);

  // Write state.json
  const state = createInitialState();
  await writeState(join(wsPath, 'state.json'), state);

  // Git add and commit
  const relativePath = join(BRANCHOS_DIR, WORKSTREAMS_DIR, workstreamId);
  await git.addAndCommit(
    [relativePath],
    `chore: create workstream ${workstreamId}`,
  );

  return {
    workstreamId,
    branch,
    path: wsPath,
    created: true,
  };
}
