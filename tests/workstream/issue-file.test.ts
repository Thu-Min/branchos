import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { IssueData } from '../../src/github/issues.js';

describe('writeIssueFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-issue-file-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates issue.md with YAML frontmatter and body', async () => {
    const { writeIssueFile } = await import('../../src/workstream/issue-file.js');
    const issue: IssueData = {
      number: 42,
      title: 'Fix auth timeout on slow connections',
      body: 'When users have slow connections, the auth token request times out...',
      labels: ['bug', 'priority:high'],
      url: 'https://github.com/owner/repo/issues/42',
    };

    await writeIssueFile(tempDir, issue);

    const content = await readFile(join(tempDir, 'issue.md'), 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('number: 42');
    expect(content).toContain('title: Fix auth timeout on slow connections');
    expect(content).toContain('labels: [bug, priority:high]');
    expect(content).toContain('url: https://github.com/owner/repo/issues/42');
    expect(content).toContain('When users have slow connections');
  });

  it('handles empty labels array', async () => {
    const { writeIssueFile } = await import('../../src/workstream/issue-file.js');
    const issue: IssueData = {
      number: 1,
      title: 'Simple issue',
      body: 'Body text',
      labels: [],
      url: 'https://github.com/owner/repo/issues/1',
    };

    await writeIssueFile(tempDir, issue);

    const content = await readFile(join(tempDir, 'issue.md'), 'utf-8');
    expect(content).toContain('labels: []');
  });
});

describe('readIssueFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-issue-file-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('parses issue.md back into IssueData', async () => {
    const { writeIssueFile, readIssueFile } = await import('../../src/workstream/issue-file.js');
    const issue: IssueData = {
      number: 42,
      title: 'Fix auth timeout on slow connections',
      body: 'When users have slow connections, the auth token request times out...',
      labels: ['bug', 'priority:high'],
      url: 'https://github.com/owner/repo/issues/42',
    };

    await writeIssueFile(tempDir, issue);
    const result = await readIssueFile(tempDir);

    expect(result).not.toBeNull();
    expect(result!.number).toBe(42);
    expect(result!.title).toBe('Fix auth timeout on slow connections');
    expect(result!.body).toBe('When users have slow connections, the auth token request times out...');
    expect(result!.labels).toEqual(['bug', 'priority:high']);
    expect(result!.url).toBe('https://github.com/owner/repo/issues/42');
  });

  it('returns null when issue.md does not exist', async () => {
    const { readIssueFile } = await import('../../src/workstream/issue-file.js');
    const result = await readIssueFile(tempDir);
    expect(result).toBeNull();
  });

  it('round-trips empty labels correctly', async () => {
    const { writeIssueFile, readIssueFile } = await import('../../src/workstream/issue-file.js');
    const issue: IssueData = {
      number: 5,
      title: 'No labels',
      body: 'Body',
      labels: [],
      url: 'https://github.com/owner/repo/issues/5',
    };

    await writeIssueFile(tempDir, issue);
    const result = await readIssueFile(tempDir);

    expect(result).not.toBeNull();
    expect(result!.labels).toEqual([]);
  });
});
