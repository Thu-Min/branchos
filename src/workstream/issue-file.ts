import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { IssueData } from '../github/issues.js';
import {
  parseGenericFrontmatter,
  stringifyGenericFrontmatter,
} from '../roadmap/frontmatter.js';

const ISSUE_FIELD_ORDER = ['number', 'title', 'labels', 'url'] as const;

function stringifyIssueValue(key: string, value: unknown): string {
  if (key === 'labels') {
    const arr = value as string[];
    return `[${arr.join(', ')}]`;
  }
  return String(value);
}

function parseIssueValue(key: string, raw: string): unknown {
  if (key === 'number') {
    return parseInt(raw, 10);
  }
  if (key === 'labels') {
    const trimmed = raw.trim();
    // Handle empty array
    if (trimmed === '[]') return [];
    // Strip brackets, split on commas, trim each
    const inner = trimmed.replace(/^\[/, '').replace(/\]$/, '');
    return inner.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }
  return raw;
}

export async function writeIssueFile(wsPath: string, issue: IssueData): Promise<void> {
  const data = {
    number: issue.number,
    title: issue.title,
    labels: issue.labels,
    url: issue.url,
  };

  const frontmatter = stringifyGenericFrontmatter(
    data,
    ISSUE_FIELD_ORDER as unknown as readonly (keyof typeof data & string)[],
    stringifyIssueValue,
  );

  const content = `${frontmatter}\n\n${issue.body}\n`;
  await writeFile(join(wsPath, 'issue.md'), content);
}

export async function readIssueFile(wsPath: string): Promise<IssueData | null> {
  let content: string;
  try {
    content = await readFile(join(wsPath, 'issue.md'), 'utf-8');
  } catch {
    return null;
  }

  const { data, body } = parseGenericFrontmatter<Record<string, unknown>>(
    content,
    parseIssueValue,
  );

  return {
    number: data.number as number,
    title: data.title as string,
    body: body,
    labels: data.labels as string[],
    url: data.url as string,
  };
}
