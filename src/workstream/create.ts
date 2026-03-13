import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR, WORKSTREAMS_DIR } from '../constants.js';
import { slugifyBranch, isProtectedBranch } from './resolve.js';
import { discoverWorkstreams } from './discover.js';
import { createMeta, writeMeta } from '../state/meta.js';
import { captureAssignee } from '../github/index.js';
import { createInitialState, writeState } from '../state/state.js';
import { readAllFeatures, writeFeatureFile } from '../roadmap/feature-file.js';
import { featureBranch } from '../roadmap/slug.js';
import { promptYesNo } from './prompt.js';
import { titleSimilarity } from '../roadmap/similarity.js';
import type { Feature } from '../roadmap/types.js';

export interface CreateWorkstreamResult {
  workstreamId: string;
  branch: string;
  path: string;
  created: boolean;
  featureId?: string;
}

export async function createWorkstream(options: {
  repoRoot: string;
  nameOverride?: string;
  featureId?: string;
}): Promise<CreateWorkstreamResult> {
  const { repoRoot, nameOverride, featureId } = options;
  const git = new GitOps(repoRoot);

  // Check .branchos/ exists
  const branchosPath = join(repoRoot, BRANCHOS_DIR);
  try {
    await access(branchosPath);
  } catch {
    throw new Error(
      'BranchOS not initialized. Run `branchos init` first.',
    );
  }

  // Feature-linked flow
  if (featureId) {
    return createFeatureLinkedWorkstream(repoRoot, git, branchosPath, featureId);
  }

  // Standard flow: get current branch
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

  // Capture assignee from GitHub CLI
  const assignee = await captureAssignee();

  // Write meta.json
  const meta = createMeta(workstreamId, branch, undefined, assignee);
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

async function createFeatureLinkedWorkstream(
  repoRoot: string,
  git: GitOps,
  branchosPath: string,
  featureId: string,
): Promise<CreateWorkstreamResult> {
  // 1. Read features
  const featuresDir = join(branchosPath, SHARED_DIR, 'features');
  const features = await readAllFeatures(featuresDir);

  // 2. Validate: no features
  if (features.length === 0) {
    throw new Error(
      'No features found. Run `branchos plan-roadmap` to generate features first.',
    );
  }

  // 3. Find feature by ID
  const feature = features.find((f) => f.id === featureId);
  if (!feature) {
    const availableIds = features.map((f) => f.id).join(', ');
    throw new Error(
      `Feature ${featureId} not found. Available: ${availableIds}`,
    );
  }

  // 4. Check not already in-progress
  if (feature.status === 'in-progress') {
    throw new Error(
      `Feature ${featureId} is already in-progress (workstream: ${feature.workstream ?? 'unknown'}).`,
    );
  }

  // 5. Generate branch name from feature title
  const branchName = featureBranch(feature.title);

  // 6. Handle branch: check if exists, create or checkout
  const exists = await git.branchExists(branchName);
  if (exists) {
    const confirmed = await promptYesNo(
      `Branch ${branchName} already exists. Use it? (y/n) `,
    );
    if (!confirmed) {
      throw new Error('Aborted.');
    }
    await git.checkoutBranch(branchName);
  } else {
    await git.checkoutBranch(branchName, true);
  }

  // 7. Derive workstream ID from branch
  const workstreamId = slugifyBranch(branchName);

  // 8. Check for collision
  const workstreamsDir = join(branchosPath, WORKSTREAMS_DIR);
  const existing = await discoverWorkstreams(workstreamsDir);
  if (existing.includes(workstreamId)) {
    throw new Error(
      `Workstream '${workstreamId}' already exists for this feature.`,
    );
  }

  // 9. Create workstream directory
  const wsPath = join(workstreamsDir, workstreamId);
  await mkdir(wsPath, { recursive: true });

  // 10. Capture assignee from GitHub CLI
  const assignee = await captureAssignee();

  // 11. Write meta.json with featureId
  const meta = createMeta(workstreamId, branchName, featureId, assignee);
  await writeMeta(join(wsPath, 'meta.json'), meta);

  // 11. Write state.json
  const state = createInitialState();
  await writeState(join(wsPath, 'state.json'), state);

  // 12. Update feature: status='in-progress', workstream=workstreamId
  const updatedFeature = {
    ...feature,
    status: 'in-progress' as const,
    workstream: workstreamId,
  };
  await writeFeatureFile(featuresDir, updatedFeature);

  // 13. Atomic commit: workstream dir + feature file
  const wsRelativePath = join(BRANCHOS_DIR, WORKSTREAMS_DIR, workstreamId);
  const featureRelPath = join(BRANCHOS_DIR, SHARED_DIR, 'features', feature.filename);
  await git.addAndCommit(
    [wsRelativePath, featureRelPath],
    `chore: create workstream ${workstreamId} for feature ${featureId}`,
  );

  return {
    workstreamId,
    branch: branchName,
    path: wsPath,
    created: true,
    featureId,
  };
}

export function findFeatureByIssue(
  features: Feature[],
  issueNumber: number,
  issueTitle: string,
): Feature | null {
  // Tier 1: exact issue number match
  const exactMatch = features.find((f) => f.issue === issueNumber);
  if (exactMatch) return exactMatch;

  // Tier 2: title similarity at 0.8 threshold
  let bestMatch: Feature | null = null;
  let bestScore = 0;
  for (const f of features) {
    const score = titleSimilarity(f.title, issueTitle);
    if (score >= 0.8 && score > bestScore) {
      bestScore = score;
      bestMatch = f;
    }
  }
  return bestMatch;
}
