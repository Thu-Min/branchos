import { Command } from 'commander';
import { access, readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { readMeta, hashContent, writeMeta } from '../prfaq/hash.js';
import { generateRoadmapMarkdown } from '../roadmap/roadmap-file.js';
import { readAllFeatures, writeFeatureFile } from '../roadmap/feature-file.js';
import { matchFeaturesByTitle } from '../roadmap/similarity.js';
import { featureFilename, featureBranch } from '../roadmap/slug.js';
import { promptYesNo } from '../workstream/prompt.js';
import { success, error as errorOutput, output } from '../output/index.js';
import type { RoadmapData, Feature } from '../roadmap/types.js';
import type { PrfaqMeta } from '../prfaq/types.js';

export interface RefreshRoadmapOptions {
  json: boolean;
  force: boolean;
  cwd?: string;
  roadmapData?: RoadmapData;
}

export interface RefreshRoadmapResult {
  success: boolean;
  updated: number;
  added: number;
  dropped: number;
  unchanged: number;
  error?: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the numeric part from a feature ID like "F-003" -> 3.
 */
function featureIdNumber(id: string): number {
  const match = id.match(/^F-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Format a feature ID from a number: 4 -> "F-004".
 */
function formatFeatureId(n: number): string {
  return `F-${String(n).padStart(3, '0')}`;
}

/**
 * Collect all features from RoadmapData milestones into a flat list.
 */
function flattenNewFeatures(roadmapData: RoadmapData): Feature[] {
  const features: Feature[] = [];
  for (const milestone of roadmapData.milestones) {
    for (const feature of milestone.features) {
      features.push(feature);
    }
  }
  return features;
}

export async function refreshRoadmapHandler(options: RefreshRoadmapOptions): Promise<RefreshRoadmapResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);
  const fail = (msg: string): RefreshRoadmapResult => {
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, updated: 0, added: 0, dropped: 0, unchanged: 0, error: msg };
  };

  // Validate: git repo
  if (!(await git.isGitRepo())) {
    return fail('Not a git repository. Run `git init` first.');
  }

  const repoRoot = await git.getRepoRoot();
  const branchosPath = join(repoRoot, BRANCHOS_DIR);
  const sharedDir = join(branchosPath, SHARED_DIR);

  // Validate: .branchos exists
  if (!(await fileExists(branchosPath))) {
    return fail('BranchOS not initialized. Run `branchos init` first.');
  }

  // Validate: PR-FAQ previously ingested
  const meta = await readMeta(sharedDir);
  if (!meta) {
    return fail('No PR-FAQ found. Run /branchos:ingest-prfaq first.');
  }

  // Validate: roadmapData provided
  if (!options.roadmapData) {
    return fail('No roadmap data provided. Use the /branchos:refresh-roadmap slash command to generate roadmap data from your updated PR-FAQ.');
  }

  const { roadmapData } = options;
  const featuresDir = join(sharedDir, 'features');

  // Read existing features
  const existingFeatures = await readAllFeatures(featuresDir);

  // Extract new feature titles from roadmapData
  const newFeatures = flattenNewFeatures(roadmapData);
  const newTitles = newFeatures.map((f) => f.title);

  // Match features by title similarity
  const matchResult = matchFeaturesByTitle(existingFeatures, newTitles);

  // Build merged feature list
  const mergedFeatures: Feature[] = [];
  let updatedCount = 0;
  let unchangedCount = 0;

  // Process matched features: keep old metadata, update body/title
  for (const match of matchResult.matched) {
    const oldFeature = match.oldFeature;
    const newFeature = newFeatures.find((f) => f.title === match.newTitle);
    if (!newFeature) continue;

    const titleChanged = oldFeature.title !== match.newTitle;
    const bodyChanged = oldFeature.body !== newFeature.body;

    if (titleChanged || bodyChanged) {
      updatedCount++;
    } else {
      unchangedCount++;
    }

    mergedFeatures.push({
      id: oldFeature.id,
      title: match.newTitle,
      status: oldFeature.status,
      milestone: newFeature.milestone,
      branch: oldFeature.branch,
      issue: oldFeature.issue,
      workstream: oldFeature.workstream,
      body: newFeature.body,
      filename: titleChanged ? featureFilename(oldFeature.id, match.newTitle) : oldFeature.filename,
      dependsOn: newFeature.dependsOn,
    });
  }

  // Process dropped features: set status to 'dropped'
  const droppedFeatures: Feature[] = matchResult.dropped.map((f) => ({
    ...f,
    status: 'dropped' as const,
  }));

  // Process new features: generate sequential IDs
  const allExistingIds = existingFeatures.map((f) => featureIdNumber(f.id));
  let maxId = allExistingIds.length > 0 ? Math.max(...allExistingIds) : 0;

  const addedFeatures: Feature[] = matchResult.added.map((title) => {
    maxId++;
    const id = formatFeatureId(maxId);
    const newFeature = newFeatures.find((f) => f.title === title);
    return {
      id,
      title,
      status: 'unassigned' as const,
      milestone: newFeature?.milestone || 'M1',
      branch: featureBranch(title),
      issue: null,
      workstream: null,
      body: newFeature?.body || `## Acceptance Criteria\n\n- [ ] ${title}`,
      filename: featureFilename(id, title),
      dependsOn: newFeature?.dependsOn,
    };
  });

  const addedCount = addedFeatures.length;
  const droppedCount = droppedFeatures.length;

  // Show summary
  if (!options.json) {
    console.log(`\nRefresh Summary: ${updatedCount} updated, ${addedCount} new, ${droppedCount} dropped, ${unchangedCount} unchanged\n`);
  }

  // Confirmation
  if (!options.force) {
    const confirmed = await promptYesNo('Apply these changes? (y/n) ');
    if (!confirmed) {
      return { success: false, updated: updatedCount, added: addedCount, dropped: droppedCount, unchanged: unchangedCount, error: 'User declined changes.' };
    }
  }

  // Write all feature files
  const writtenPaths: string[] = [];

  for (const feature of [...mergedFeatures, ...droppedFeatures, ...addedFeatures]) {
    await writeFeatureFile(featuresDir, feature);
    writtenPaths.push(`.branchos/shared/features/${feature.filename}`);
  }

  // Rebuild roadmapData with merged features for ROADMAP.md generation
  const mergedRoadmapData: RoadmapData = {
    projectName: roadmapData.projectName,
    vision: roadmapData.vision,
    milestones: roadmapData.milestones.map((ms) => ({
      ...ms,
      features: [
        ...mergedFeatures.filter((f) => f.milestone === ms.id),
        ...addedFeatures.filter((f) => f.milestone === ms.id),
      ],
    })),
  };

  // Add dropped features that belonged to existing milestones
  // (or put them in the first milestone if their milestone is gone)
  for (const df of droppedFeatures) {
    const targetMs = mergedRoadmapData.milestones.find((ms) => ms.id === df.milestone);
    if (targetMs) {
      targetMs.features.push(df);
    } else if (mergedRoadmapData.milestones.length > 0) {
      mergedRoadmapData.milestones[0].features.push(df);
    }
  }

  // Regenerate ROADMAP.md
  const roadmapPath = join(sharedDir, 'ROADMAP.md');
  const roadmapContent = generateRoadmapMarkdown(mergedRoadmapData);
  await writeFile(roadmapPath, roadmapContent);
  writtenPaths.push('.branchos/shared/ROADMAP.md');

  // Re-ingest PR-FAQ: read latest from repo root, copy to shared dir, update hash
  const prfaqSourcePath = join(repoRoot, 'PR-FAQ.md');
  const prfaqDestPath = join(sharedDir, 'PR-FAQ.md');
  if (await fileExists(prfaqSourcePath)) {
    const prfaqContent = await readFile(prfaqSourcePath, 'utf-8');
    await copyFile(prfaqSourcePath, prfaqDestPath);
    const newHash = hashContent(prfaqContent);
    const updatedMeta: PrfaqMeta = {
      ...meta,
      contentHash: newHash,
      ingestedAt: new Date().toISOString(),
    };
    await writeMeta(sharedDir, updatedMeta);
    writtenPaths.push('.branchos/shared/PR-FAQ.md');
    writtenPaths.push('.branchos/shared/prfaq-meta.json');
  }

  // Auto-commit
  await git.addAndCommit(writtenPaths, 'chore: refresh roadmap and features from updated PR-FAQ');

  // Output
  if (!options.json) {
    success(`Refreshed roadmap: ${updatedCount} updated, ${addedCount} new, ${droppedCount} dropped.`, { json: false });
    output({ next: 'run /branchos:features to view updated features' }, { json: false });
  }

  return { success: true, updated: updatedCount, added: addedCount, dropped: droppedCount, unchanged: unchangedCount };
}

export function registerRefreshRoadmapCommand(program: Command): void {
  program
    .command('refresh-roadmap')
    .description('Refresh roadmap and features from updated PR-FAQ')
    .option('--json', 'Output in JSON format', false)
    .option('--force', 'Apply changes without confirmation', false)
    .action(async (opts) => {
      const result = await refreshRoadmapHandler({ json: opts.json, force: opts.force });
      if (opts.json) console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
    });
}
