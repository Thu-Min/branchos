import { Command } from 'commander';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { checkGhAvailable, captureAssignee, ghExec } from '../github/index.js';
import { assemblePrBody, checkExistingPr, createPr, getDefaultBranch } from '../github/pr.js';
import { readMeta } from '../state/meta.js';
import { readAllFeatures } from '../roadmap/feature-file.js';
import { parseAcceptanceCriteria } from '../roadmap/gwt-parser.js';
import { resolveCurrentWorkstream } from '../phase/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { error, success } from '../output/index.js';

export interface CreatePrOptions {
  cwd?: string;
  json?: boolean;
  dryRun?: boolean;
}

export interface CreatePrResult {
  success: boolean;
  url?: string;
  error?: string;
  title?: string;
  body?: string;
}

export async function createPrHandler(options: CreatePrOptions): Promise<CreatePrResult> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();

  // Pre-flight: check gh availability
  const { available, authenticated } = await checkGhAvailable();
  if (!available) {
    return { success: false, error: 'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/' };
  }
  if (!authenticated) {
    return { success: false, error: 'GitHub CLI is not authenticated. Run `gh auth login` first.' };
  }

  // Resolve current workstream
  const workstream = await resolveCurrentWorkstream(repoRoot);
  if (!workstream) {
    return { success: false, error: 'No workstream found for current branch.' };
  }

  // Read workstream meta
  const metaPath = join(workstream.path, 'meta.json');
  const meta = await readMeta(metaPath);

  // Check feature link
  if (!meta.featureId) {
    return { success: false, error: 'No feature linked to this workstream. PR creation requires a feature for body assembly.' };
  }

  // Read feature
  const featuresDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, 'features');
  const features = await readAllFeatures(featuresDir);
  const feature = features.find((f) => f.id === meta.featureId);
  if (!feature) {
    return { success: false, error: `Feature ${meta.featureId} not found in features directory.` };
  }

  // Get default branch
  const defaultBranch = await getDefaultBranch();

  // Check commits ahead
  const commitsAhead = await git.getCommitsAhead(defaultBranch);
  if (commitsAhead <= 0) {
    return { success: false, error: `No commits ahead of ${defaultBranch}. Nothing to create a PR for.` };
  }

  // Check for existing PR
  const currentBranch = await git.getCurrentBranch();
  const existingPr = await checkExistingPr(currentBranch);
  if (existingPr) {
    return { success: false, error: `PR already exists: ${existingPr.url}`, url: existingPr.url };
  }

  // Split feature body at ## Acceptance Criteria to get description
  const acHeadingIndex = feature.body.indexOf('## Acceptance Criteria');
  const featureDescription = acHeadingIndex === -1
    ? feature.body.trim()
    : feature.body.slice(0, acHeadingIndex).trim();

  // Parse acceptance criteria
  const parsedCriteria = parseAcceptanceCriteria(feature.body);

  // Assemble PR body
  const body = assemblePrBody({
    featureId: feature.id,
    featureTitle: feature.title,
    featureDescription,
    parsedCriteria,
    issueNumber: meta.issueNumber,
  });

  // Build title
  const title = `[${feature.id}] ${feature.title}`;

  // Dry run: print and exit
  if (options.dryRun) {
    console.log(`Title: ${title}\n`);
    console.log(body);
    if (options.json) {
      console.log(JSON.stringify({ title, body }, null, 2));
    }
    return { success: true, title, body };
  }

  // Determine assignee with fallback
  let assignee = meta.assignee;
  if (!assignee) {
    try {
      assignee = await captureAssignee();
    } catch {
      assignee = null;
    }
  }

  // Auto-push if branch not on remote
  try {
    const lsRemoteOutput = await ghExec(['api', '--method', 'GET', '-H', 'Accept: application/vnd.github+json', `/repos/{owner}/{repo}/branches/${currentBranch}`]);
    // Branch exists on remote, no push needed
  } catch {
    // Branch not on remote or error checking - push it
    console.log(`Pushing branch to origin...`);
    await git.push();
  }

  // Create the PR
  const url = await createPr({
    title,
    body,
    baseBranch: defaultBranch,
    assignee,
  });

  console.log(`PR created: ${url}`);
  return { success: true, url };
}

export function registerCreatePrCommand(program: Command): void {
  program
    .command('create-pr')
    .description('Create a GitHub PR from workstream context')
    .option('--json', 'Output in JSON format', false)
    .option('--dry-run', 'Preview PR title and body without creating', false)
    .option('--cwd <path>', 'Working directory')
    .action(async (opts: { json: boolean; dryRun: boolean; cwd?: string }) => {
      try {
        const result = await createPrHandler({
          json: opts.json,
          dryRun: opts.dryRun,
          cwd: opts.cwd,
        });
        if (!result.success) {
          error(result.error!, { json: opts.json });
          process.exit(1);
        }
        if (opts.json && result.url) {
          console.log(JSON.stringify({ success: true, url: result.url }, null, 2));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
