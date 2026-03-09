import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { BRANCHOS_DIR, SHARED_DIR } from '../constants.js';
import { detectSections, isLikelyPrfaq } from '../prfaq/validate.js';
import { hashContent, readMeta, writeMeta, diffSections } from '../prfaq/hash.js';
import { promptYesNo } from '../workstream/prompt.js';
import { success, error as errorOutput, warning, output } from '../output/index.js';
import type { IngestPrfaqOptions, IngestPrfaqResult } from '../prfaq/types.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ingestPrfaqHandler(options: IngestPrfaqOptions): Promise<IngestPrfaqResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);

  // Verify git repo
  if (!(await git.isGitRepo())) {
    const msg = 'Not a git repository. Run `git init` first.';
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, action: 'unchanged', sectionsFound: [], sectionsMissing: [], warnings: [], error: msg };
  }

  const repoRoot = await git.getRepoRoot();
  const branchosPath = join(repoRoot, BRANCHOS_DIR);
  const sharedDir = join(branchosPath, SHARED_DIR);

  // Check .branchos/ exists
  if (!(await fileExists(branchosPath))) {
    const msg = 'BranchOS not initialized. Run `branchos init` first.';
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, action: 'unchanged', sectionsFound: [], sectionsMissing: [], warnings: [], error: msg };
  }

  // Check PR-FAQ.md exists
  const prfaqPath = join(repoRoot, 'PR-FAQ.md');
  if (!(await fileExists(prfaqPath))) {
    const msg = 'No PR-FAQ.md found in repo root. Create a PR-FAQ document at ./PR-FAQ.md and try again.';
    if (!options.json) {
      errorOutput(msg, { json: false });
    }
    return { success: false, action: 'unchanged', sectionsFound: [], sectionsMissing: [], warnings: [], error: msg };
  }

  // Read content once
  const content = await readFile(prfaqPath, 'utf-8');

  // Detect sections
  const { found: sectionsFound, missing: sectionsMissing } = detectSections(content);

  // Check if this looks like a PR-FAQ
  if (!isLikelyPrfaq(content) && !options.force) {
    const confirmed = await promptYesNo(
      `This doesn't look like a PR-FAQ (only ${sectionsFound.length}/8 expected sections found). Continue anyway? (y/N) `,
    );
    if (!confirmed) {
      return {
        success: false,
        action: 'unchanged',
        sectionsFound,
        sectionsMissing,
        warnings: [],
        error: 'Aborted by user',
      };
    }
  }

  // Compute hash
  const contentHash = hashContent(content);

  // Read existing metadata
  const existingMeta = await readMeta(sharedDir);

  // Check for changes
  if (existingMeta && existingMeta.contentHash === contentHash) {
    if (!options.json) {
      success('No changes detected.', { json: false });
    }
    return {
      success: true,
      action: 'unchanged',
      sectionsFound,
      sectionsMissing,
      warnings: [],
    };
  }

  // Determine action and compute diff if updating
  let action: 'ingested' | 'updated';
  let diff: IngestPrfaqResult['diff'];

  if (existingMeta) {
    action = 'updated';
    // Read old content for diffing
    const oldContent = await readFile(join(sharedDir, 'PR-FAQ.md'), 'utf-8');
    diff = diffSections(oldContent, content);
  } else {
    action = 'ingested';
  }

  // Write PR-FAQ to shared directory
  await writeFile(join(sharedDir, 'PR-FAQ.md'), content);

  // Write metadata
  await writeMeta(sharedDir, {
    contentHash,
    ingestedAt: new Date().toISOString(),
    version: 1,
    sectionsFound,
    sectionsMissing,
    sourceSize: Buffer.byteLength(content),
  });

  // Auto-commit
  const commitMsg = action === 'ingested' ? 'chore: ingest PR-FAQ' : 'chore: update PR-FAQ';
  await git.addAndCommit(
    ['.branchos/shared/PR-FAQ.md', '.branchos/shared/prfaq-meta.json'],
    commitMsg,
  );

  // Build warnings
  const warnings: string[] = [];
  if (sectionsMissing.length > 0) {
    warnings.push(`Missing sections: ${sectionsMissing.join(', ')}`);
  }

  // Human output
  if (!options.json) {
    if (action === 'ingested') {
      success(`Ingested PR-FAQ (${sectionsFound.length}/8 sections found).`, { json: false });
    } else {
      success('Updated PR-FAQ.', { json: false });
    }

    if (sectionsMissing.length > 0) {
      warning(`Missing sections: ${sectionsMissing.join(', ')}`, { json: false });
    }

    if (action === 'updated' && diff) {
      const changes: string[] = [];
      if (diff.modified.length > 0) changes.push(`Updated: ${diff.modified.join(', ')}`);
      if (diff.added.length > 0) changes.push(`Added: ${diff.added.join(', ')}`);
      if (diff.removed.length > 0) changes.push(`Removed: ${diff.removed.join(', ')}`);
      if (changes.length > 0) {
        output({ changes: changes.join('. ') }, { json: false });
      }
    }

    output({ next: 'run /branchos:plan-roadmap to generate your roadmap' }, { json: false });
  }

  return {
    success: true,
    action,
    sectionsFound,
    sectionsMissing,
    warnings,
    diff,
  };
}

export function registerIngestPrfaqCommand(program: Command): void {
  program
    .command('ingest-prfaq')
    .description('Ingest PR-FAQ document for project planning')
    .option('--json', 'Output in JSON format', false)
    .option('--force', 'Skip confirmation prompts', false)
    .action(async (opts) => {
      const result = await ingestPrfaqHandler({ json: opts.json, force: opts.force });
      if (!result.success) {
        process.exit(1);
      }
    });
}
