import { Command } from 'commander';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { checkGhAvailable } from '../github/index.js';
import { createIssue, updateIssue } from '../github/issues.js';
import { ensureStatusLabels } from '../github/labels.js';
import { ensureMilestone } from '../github/milestones.js';
import { readAllFeatures, writeFeatureFile } from '../roadmap/feature-file.js';
import { success, error as errorOutput } from '../output/index.js';
import type { Feature } from '../roadmap/types.js';
import { access } from 'fs/promises';

export interface SyncIssuesOptions {
  json: boolean;
  dryRun: boolean;
  force: boolean;
  cwd?: string;
}

export interface SyncIssueEntry {
  featureId: string;
  title: string;
  issueNumber: number;
  url: string;
  action: 'created' | 'updated' | 'skipped';
}

export interface SyncIssuesResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  issues: SyncIssueEntry[];
  warnings: string[];
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildIssueBody(feature: Feature, allFeatures: Feature[]): string {
  let body = feature.body;

  if (feature.dependsOn && feature.dependsOn.length > 0) {
    body += '\n\n## Dependencies\n\n';
    for (const depId of feature.dependsOn) {
      const dep = allFeatures.find((f) => f.id === depId);
      if (dep && dep.issue) {
        body += `- #${dep.issue} (${depId})\n`;
      } else {
        body += `- ${depId} (no issue yet)\n`;
      }
    }
  }

  return body;
}

export async function syncIssuesHandler(options: SyncIssuesOptions): Promise<SyncIssuesResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);
  const issues: SyncIssueEntry[] = [];
  const warnings: string[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const fail = (msg: string): SyncIssuesResult => {
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, created: 0, updated: 0, skipped: 0, issues: [], warnings: [], error: msg };
  };

  // Validate: git repo
  if (!(await git.isGitRepo())) {
    return fail('Not a git repository. Run `git init` first.');
  }

  const repoRoot = await git.getRepoRoot();
  const branchosPath = join(repoRoot, BRANCHOS_DIR);

  // Validate: .branchos exists
  if (!(await fileExists(branchosPath))) {
    return fail('BranchOS not initialized. Run `branchos init` first.');
  }

  // Validate: gh available + authenticated
  const gh = await checkGhAvailable();
  if (!gh.available) {
    return fail('GitHub CLI (gh) not installed. Install from https://cli.github.com/');
  }
  if (!gh.authenticated) {
    return fail('GitHub CLI not authenticated. Run `gh auth login` first.');
  }

  // Read features
  const featuresDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, 'features');
  const allFeatures = await readAllFeatures(featuresDir);

  if (allFeatures.length === 0) {
    return fail('No features found. Run /branchos:plan-roadmap first.');
  }

  // Separate syncable from skipped
  const syncable: Feature[] = [];
  for (const feature of allFeatures) {
    if (feature.status === 'complete' || feature.status === 'dropped') {
      skipped++;
      issues.push({
        featureId: feature.id,
        title: feature.title,
        issueNumber: feature.issue ?? 0,
        url: '',
        action: 'skipped',
      });
    } else {
      syncable.push(feature);
    }
  }

  if (syncable.length === 0) {
    if (!options.json) {
      success('No syncable features (all complete or dropped).', { json: false });
    }
    return { success: true, created: 0, updated: 0, skipped, issues, warnings };
  }

  // Ensure status labels exist
  if (!options.dryRun) {
    await ensureStatusLabels();
  }

  // Collect unique milestones and ensure they exist
  const milestones = [...new Set(syncable.map((f) => f.milestone).filter(Boolean))];
  if (!options.dryRun) {
    for (const ms of milestones) {
      await ensureMilestone(ms);
    }
  }

  // Process features sequentially
  const updatedFeatures: Feature[] = [];
  for (let i = 0; i < syncable.length; i++) {
    const feature = { ...syncable[i] };
    const issueBody = buildIssueBody(feature, allFeatures);

    if (feature.issue === null || feature.issue === undefined) {
      // Create new issue
      if (options.dryRun) {
        issues.push({
          featureId: feature.id,
          title: feature.title,
          issueNumber: 0,
          url: '',
          action: 'created',
        });
        created++;
      } else {
        try {
          const result = await retryOnRateLimit(() =>
            createIssue({
              title: `[${feature.id}] ${feature.title}`,
              body: issueBody,
              labels: [feature.status],
              milestone: feature.milestone || undefined,
            }),
          );
          feature.issue = result.number;
          issues.push({
            featureId: feature.id,
            title: feature.title,
            issueNumber: result.number,
            url: result.url,
            action: 'created',
          });
          created++;
          updatedFeatures.push(feature);
        } catch (err: any) {
          warnings.push(`Failed to create issue for ${feature.id}: ${err.message}`);
          continue;
        }
      }
    } else {
      // Update existing issue
      if (options.dryRun) {
        issues.push({
          featureId: feature.id,
          title: feature.title,
          issueNumber: feature.issue,
          url: '',
          action: 'updated',
        });
        updated++;
      } else {
        try {
          // Determine label transitions: remove all status labels except current
          const statusLabels = ['unassigned', 'assigned', 'in-progress', 'complete', 'dropped'];
          const removeLabels = statusLabels.filter((s) => s !== feature.status);

          await retryOnRateLimit(() =>
            updateIssue(feature.issue!, {
              body: issueBody,
              addLabels: [feature.status],
              removeLabels,
              milestone: feature.milestone || undefined,
            }),
          );
          issues.push({
            featureId: feature.id,
            title: feature.title,
            issueNumber: feature.issue,
            url: '',
            action: 'updated',
          });
          updated++;
          updatedFeatures.push(feature);
        } catch (err: any) {
          warnings.push(`Failed to update issue for ${feature.id}: ${err.message}`);
          continue;
        }
      }
    }

    // Delay between calls (skip for last item and dry-run)
    if (!options.dryRun && i < syncable.length - 1) {
      await delay(500);
    }
  }

  // Write updated feature files back to disk
  if (!options.dryRun && updatedFeatures.length > 0) {
    const writtenPaths: string[] = [];
    for (const feature of updatedFeatures) {
      await writeFeatureFile(featuresDir, feature);
      writtenPaths.push(`.branchos/shared/features/${feature.filename}`);
    }

    // Auto-commit
    await git.addAndCommit(writtenPaths, 'chore: sync feature issue numbers from GitHub');
  }

  // Print summary
  if (!options.json) {
    if (options.dryRun) {
      console.log('\n[DRY RUN] No changes made.\n');
    }
    console.log(`\nSync Summary: ${created} created, ${updated} updated, ${skipped} skipped\n`);
    console.log('  ID       | Issue | Action  | Title');
    console.log('  ---------|-------|---------|------');
    for (const entry of issues) {
      const num = entry.issueNumber ? `#${entry.issueNumber}` : '--';
      console.log(`  ${entry.featureId.padEnd(8)} | ${num.padEnd(5)} | ${entry.action.padEnd(7)} | ${entry.title}`);
    }
    console.log('');

    if (warnings.length > 0) {
      console.log('Warnings:');
      for (const w of warnings) {
        console.log(`  - ${w}`);
      }
    }
  }

  return { success: true, created, updated, skipped, issues, warnings };
}

async function retryOnRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('rate limit') || msg.includes('403') || msg.includes('429')) {
      await delay(3000);
      return await fn();
    }
    throw err;
  }
}

export function registerSyncIssuesCommand(program: Command): void {
  program
    .command('sync-issues')
    .description('Push features to GitHub Issues')
    .option('--json', 'Output in JSON format', false)
    .option('--dry-run', 'Preview without making changes', false)
    .option('--force', 'Sync even if no changes detected', false)
    .action(async (opts) => {
      const result = await syncIssuesHandler({ json: opts.json, dryRun: opts.dryRun, force: opts.force });
      if (opts.json) console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
    });
}
