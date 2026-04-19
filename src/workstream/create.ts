import { mkdir, access } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR, WORKSTREAMS_DIR } from '../constants.js';
import { slugifyBranch, isProtectedBranch } from './resolve.js';
import { discoverWorkstreams } from './discover.js';
import { createMeta, writeMeta } from '../state/meta.js';
import { captureAssignee, ghExec } from '../github/index.js';
import { createInitialState, writeState } from '../state/state.js';
import { readAllFeatures, writeFeatureFile } from '../roadmap/feature-file.js';
import { featureBranch } from '../roadmap/slug.js';
import { promptYesNo } from './prompt.js';
import { titleSimilarity } from '../roadmap/similarity.js';
import type { Feature } from '../roadmap/types.js';
import { fetchIssue } from '../github/issues.js';
import { writeIssueFile } from './issue-file.js';

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
  issueNumber?: number;
  yes?: boolean;
}): Promise<CreateWorkstreamResult> {
  const { repoRoot, nameOverride, featureId, issueNumber, yes } = options;
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

  // Mutual exclusivity check
  if (featureId && issueNumber) {
    throw new Error(
      'Cannot use --issue and --feature together. Use one or the other.',
    );
  }

  // Issue-linked flow: fetch issue, find feature, delegate to feature-linked flow
  if (issueNumber) {
    const issueData = await fetchIssue(issueNumber);

    // Read features for reverse-lookup
    const featuresDir = join(branchosPath, SHARED_DIR, 'features');
    const features = await readAllFeatures(featuresDir);

    const matchedFeature = findFeatureByIssue(features, issueNumber, issueData.title);
    if (!matchedFeature) {
      throw new Error(
        `No feature found for issue #${issueNumber}. The --issue flag requires a matching feature (created by sync-issues or with matching title).`,
      );
    }

    const result = await createFeatureLinkedWorkstream(repoRoot, git, branchosPath, matchedFeature.id, issueNumber, yes);

    // Write issue.md to workstream directory
    await writeIssueFile(result.path, issueData);

    // Commit issue.md as a follow-up
    const issueRelPath = join(BRANCHOS_DIR, WORKSTREAMS_DIR, result.workstreamId, 'issue.md');
    await git.addAndCommit(
      [issueRelPath],
      `chore: add issue.md for workstream ${result.workstreamId}`,
    );

    return result;
  }

  // Feature-linked flow
  if (featureId) {
    return createFeatureLinkedWorkstream(repoRoot, git, branchosPath, featureId, undefined, yes);
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
  issueNumber?: number,
  yes?: boolean,
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
    if (!yes) {
      if (!process.stdin.isTTY) {
        throw new Error(
          `Branch '${branchName}' already exists for feature ${featureId}. ` +
            `Re-run with --yes to use the existing branch.`,
        );
      }
      const confirmed = await promptYesNo(
        `Branch ${branchName} already exists. Use it? (y/n) `,
      );
      if (!confirmed) {
        throw new Error('Aborted.');
      }
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

  // 11. Write meta.json with featureId and optional issueNumber
  const meta = createMeta(workstreamId, branchName, featureId, assignee, issueNumber ?? null);
  await writeMeta(join(wsPath, 'meta.json'), meta);

  // 11. Write state.json
  const state = createInitialState();
  await writeState(join(wsPath, 'state.json'), state);

  // 12. Update feature: status='in-progress', workstream=workstreamId, assignee
  const updatedFeature = {
    ...feature,
    status: 'in-progress' as const,
    workstream: workstreamId,
    assignee: assignee,
  };
  await writeFeatureFile(featuresDir, updatedFeature);

  // 12b. Auto-assign GitHub issue
  const effectiveIssueNumber = issueNumber ?? feature.issue;
  if (effectiveIssueNumber && assignee) {
    try {
      await ghExec(['issue', 'edit', String(effectiveIssueNumber), '--add-assignee', assignee]);
    } catch (err: any) {
      console.warn(`Warning: failed to assign issue #${effectiveIssueNumber} to ${assignee}: ${err.message}`);
    }
  }

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
