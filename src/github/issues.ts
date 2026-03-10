import { ghExec } from './index.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface CreateIssueOptions {
  title: string;
  body: string;
  labels: string[];
  milestone?: string;
}

export async function createIssue(
  opts: CreateIssueOptions,
): Promise<{ number: number; url: string }> {
  const args = ['issue', 'create', '--title', opts.title];

  // For large bodies, use --body-file with a temp file
  const BODY_SIZE_LIMIT = 32 * 1024;
  let tempFile: string | null = null;

  if (opts.body.length > BODY_SIZE_LIMIT) {
    tempFile = join(tmpdir(), `branchos-issue-body-${Date.now()}.md`);
    writeFileSync(tempFile, opts.body, 'utf-8');
    args.push('--body-file', tempFile);
  } else {
    args.push('--body', opts.body);
  }

  for (const label of opts.labels) {
    args.push('--label', label);
  }

  if (opts.milestone) {
    args.push('--milestone', opts.milestone);
  }

  try {
    const stdout = await ghExec(args);
    const url = stdout.trim();
    const match = url.match(/\/issues\/(\d+)/);
    const number = match ? parseInt(match[1], 10) : 0;
    return { number, url };
  } finally {
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export interface UpdateIssueOptions {
  body?: string;
  addLabels?: string[];
  removeLabels?: string[];
  milestone?: string;
}

export async function updateIssue(
  issueNumber: number,
  opts: UpdateIssueOptions,
): Promise<void> {
  const args = ['issue', 'edit', String(issueNumber)];

  if (opts.body !== undefined) {
    args.push('--body', opts.body);
  }

  if (opts.addLabels) {
    for (const label of opts.addLabels) {
      args.push('--add-label', label);
    }
  }

  if (opts.removeLabels) {
    for (const label of opts.removeLabels) {
      args.push('--remove-label', label);
    }
  }

  if (opts.milestone) {
    args.push('--milestone', opts.milestone);
  }

  await ghExec(args);
}
