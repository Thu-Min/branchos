import { ghExec } from './index.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { formatGwtChecklist, type ParsedAcceptanceCriteria } from '../roadmap/gwt-parser.js';

export interface PrBodyInput {
  featureId: string;
  featureTitle: string;
  featureDescription: string;
  parsedCriteria: ParsedAcceptanceCriteria;
  issueNumber: number | null;
}

/**
 * Pure function: assemble PR body markdown from feature data.
 * Sections are included only when non-empty.
 */
export function assemblePrBody(input: PrBodyInput): string {
  const parts: string[] = [];

  const description = input.featureDescription.trim();
  if (description) {
    parts.push(description);
  }

  const hasCriteria =
    input.parsedCriteria.gwtBlocks.length > 0 ||
    input.parsedCriteria.freeformItems.length > 0;

  if (hasCriteria) {
    parts.push(formatGwtChecklist(input.parsedCriteria));
  }

  if (input.issueNumber !== null) {
    parts.push(`Closes #${input.issueNumber}`);
  }

  return parts.join('\n\n').trimEnd();
}

/**
 * Check if an open PR already exists for the given head branch.
 */
export async function checkExistingPr(
  headBranch: string,
): Promise<{ number: number; url: string } | null> {
  const raw = await ghExec([
    'pr', 'list', '--head', headBranch, '--json', 'number,url',
  ]);
  const entries = JSON.parse(raw) as Array<{ number: number; url: string }>;
  if (entries.length === 0) {
    return null;
  }
  return { number: entries[0].number, url: entries[0].url };
}

/**
 * Create a GitHub PR using gh CLI with --body-file for large bodies.
 */
export async function createPr(opts: {
  title: string;
  body: string;
  baseBranch: string;
  assignee: string | null;
}): Promise<string> {
  const tempFile = join(tmpdir(), `branchos-pr-body-${Date.now()}.md`);
  writeFileSync(tempFile, opts.body, 'utf-8');

  const args = [
    'pr', 'create',
    '--title', opts.title,
    '--body-file', tempFile,
    '--base', opts.baseBranch,
  ];

  if (opts.assignee) {
    args.push('--assignee', opts.assignee);
  }

  try {
    const stdout = await ghExec(args);
    return stdout.trim();
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get the repository's default branch name via gh CLI.
 */
export async function getDefaultBranch(): Promise<string> {
  const raw = await ghExec(['repo', 'view', '--json', 'defaultBranchRef']);
  const data = JSON.parse(raw) as { defaultBranchRef: { name: string } };
  return data.defaultBranchRef.name;
}
