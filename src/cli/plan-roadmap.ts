import { Command } from 'commander';
import { access, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { readMeta } from '../prfaq/hash.js';
import { generateRoadmapMarkdown } from '../roadmap/roadmap-file.js';
import { writeFeatureFile } from '../roadmap/feature-file.js';
import { success, error as errorOutput, output } from '../output/index.js';
import type { RoadmapData } from '../roadmap/types.js';

export interface PlanRoadmapOptions {
  json: boolean;
  force: boolean;
  cwd?: string;
  roadmapData?: RoadmapData;
}

export interface PlanRoadmapResult {
  success: boolean;
  featureCount: number;
  milestoneCount: number;
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

export async function planRoadmapHandler(options: PlanRoadmapOptions): Promise<PlanRoadmapResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);
  const fail = (msg: string): PlanRoadmapResult => {
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, featureCount: 0, milestoneCount: 0, error: msg };
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

  // Validate: PR-FAQ ingested
  const meta = await readMeta(sharedDir);
  if (!meta) {
    return fail('No PR-FAQ found. Run /branchos:ingest-prfaq first.');
  }

  const roadmapPath = join(sharedDir, 'ROADMAP.md');
  const featuresDir = join(sharedDir, 'features');

  // Check existing ROADMAP.md
  if (await fileExists(roadmapPath)) {
    if (!options.force) {
      return fail('ROADMAP.md already exists. Use --force to regenerate.');
    }

    // Clear existing feature files when forcing
    if (await fileExists(featuresDir)) {
      try {
        const entries = await readdir(featuresDir);
        for (const entry of entries) {
          if (/^F-\d+.*\.md$/.test(entry)) {
            await unlink(join(featuresDir, entry));
          }
        }
      } catch {
        // Ignore readdir errors
      }
    }
  }

  // Validate: roadmapData provided
  if (!options.roadmapData) {
    return fail('No roadmap data provided. Use the /branchos:plan-roadmap slash command to generate roadmap data from your PR-FAQ.');
  }

  const { roadmapData } = options;

  // Generate and write ROADMAP.md
  const roadmapContent = generateRoadmapMarkdown(roadmapData);
  await writeFile(roadmapPath, roadmapContent);

  // Write feature files
  const writtenPaths: string[] = ['.branchos/shared/ROADMAP.md'];
  for (const milestone of roadmapData.milestones) {
    for (const feature of milestone.features) {
      await writeFeatureFile(featuresDir, feature);
      writtenPaths.push(`.branchos/shared/features/${feature.filename}`);
    }
  }

  // Auto-commit
  const commitMsg = 'chore: generate roadmap and feature files';
  await git.addAndCommit(writtenPaths, commitMsg);

  // Count totals
  const featureCount = roadmapData.milestones.reduce(
    (sum, m) => sum + m.features.length,
    0,
  );
  const milestoneCount = roadmapData.milestones.length;

  // Human output
  if (!options.json) {
    success(`Generated roadmap with ${milestoneCount} milestone(s) and ${featureCount} feature(s).`, { json: false });
    output({ next: 'run /branchos:features to view and manage features' }, { json: false });
  }

  return { success: true, featureCount, milestoneCount };
}

export function registerPlanRoadmapCommand(program: Command): void {
  program
    .command('plan-roadmap')
    .description('Generate roadmap and features from ingested PR-FAQ')
    .option('--json', 'Output in JSON format', false)
    .option('--force', 'Overwrite existing roadmap', false)
    .action(async (opts) => {
      const result = await planRoadmapHandler({ json: opts.json, force: opts.force });
      if (!result.success) process.exit(1);
    });
}
