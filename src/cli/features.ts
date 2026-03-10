import { Command } from 'commander';
import { join } from 'path';
import chalk from 'chalk';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { readAllFeatures } from '../roadmap/feature-file.js';
import type { Feature } from '../roadmap/types.js';

export interface FeaturesOptions {
  json: boolean;
  status?: string;
  milestone?: string;
  featureId?: string;
  cwd?: string;
}

export interface FeaturesResult {
  success: boolean;
  features?: Feature[];
  feature?: Feature;
  message?: string;
  error?: string;
}

export async function featuresHandler(options: FeaturesOptions): Promise<FeaturesResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);
  const repoRoot = await git.getRepoRoot();
  const featuresDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, 'features');

  // Read all features (returns [] if dir missing or empty)
  const allFeatures = await readAllFeatures(featuresDir);

  // No features at all
  if (allFeatures.length === 0) {
    const msg = 'No features found. Run /branchos:plan-roadmap first.';
    if (!options.json) {
      console.log(msg);
    }
    return { success: true, features: [], message: msg };
  }

  // Detail view for single feature
  if (options.featureId) {
    const feature = allFeatures.find((f) => f.id === options.featureId);
    if (!feature) {
      const msg = `Feature ${options.featureId} not found`;
      if (!options.json) {
        console.error(chalk.red('Error: ') + msg);
      }
      return { success: false, error: msg };
    }

    if (options.json) {
      console.log(JSON.stringify(feature, null, 2));
    } else {
      printFeatureDetail(feature);
    }
    return { success: true, feature };
  }

  // Apply filters
  let filtered = allFeatures;
  if (options.status) {
    filtered = filtered.filter((f) => f.status === options.status);
  }
  if (options.milestone) {
    filtered = filtered.filter((f) => f.milestone === options.milestone);
  }

  // No matches after filtering
  if (filtered.length === 0) {
    const msg = 'No features match the specified filters.';
    if (!options.json) {
      console.log(msg);
    }
    return { success: true, features: [], message: msg };
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    printFeatureTable(filtered);
  }

  return { success: true, features: filtered };
}

function printFeatureTable(features: Feature[]): void {
  const headers = ['ID', 'Title', 'Status', 'Milestone'];

  // Calculate column widths from data
  const widths = headers.map((h, i) => {
    const key = ['id', 'title', 'status', 'milestone'][i] as keyof Feature;
    const maxData = Math.max(...features.map((f) => String(f[key]).length));
    return Math.max(h.length, maxData);
  });

  const gap = '  ';

  // Header row
  const headerRow = headers
    .map((h, i) => h.padEnd(widths[i]))
    .join(gap);
  console.log(chalk.bold.cyan(headerRow));

  // Separator
  const separator = widths.map((w) => '-'.repeat(w)).join(gap);
  console.log(separator);

  // Data rows
  for (const f of features) {
    const row = [f.id, f.title, f.status, f.milestone]
      .map((val, i) => String(val).padEnd(widths[i]))
      .join(gap);
    console.log(row);
  }
}

function printFeatureDetail(feature: Feature): void {
  console.log(chalk.bold.cyan(`Feature: ${feature.id}`));
  console.log('');
  console.log(`${chalk.cyan('Title:')}     ${feature.title}`);
  console.log(`${chalk.cyan('Status:')}    ${feature.status}`);
  console.log(`${chalk.cyan('Milestone:')} ${feature.milestone}`);
  console.log(`${chalk.cyan('Branch:')}    ${feature.branch}`);
  console.log(`${chalk.cyan('Issue:')}     ${feature.issue ?? 'none'}`);
  if (feature.dependsOn && feature.dependsOn.length > 0) {
    console.log(`${chalk.cyan('Depends on:')} ${feature.dependsOn.join(', ')}`);
  }
  if (feature.body.trim()) {
    console.log('');
    console.log(feature.body.trim());
  }
}

export function registerFeaturesCommand(program: Command): void {
  program
    .command('features [id]')
    .description('List features or view feature details')
    .option('--json', 'Output in JSON format', false)
    .option('--status <status>', 'Filter by status')
    .option('--milestone <milestone>', 'Filter by milestone')
    .action(async (id: string | undefined, opts: { json: boolean; status?: string; milestone?: string }) => {
      const result = await featuresHandler({
        json: opts.json,
        status: opts.status,
        milestone: opts.milestone,
        featureId: id,
      });
      if (!result.success) process.exit(1);
    });
}
