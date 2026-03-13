import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing modules
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const { execFile } = await import('child_process');
const mockedExecFile = vi.mocked(execFile);

function mockExecFileSuccess(stdout: string, stderr = '') {
  mockedExecFile.mockImplementation(
    ((_file: string, _args: any, callback: any) => {
      if (typeof _args === 'function') {
        callback = _args;
        _args = [];
      }
      callback(null, stdout, stderr);
    }) as any,
  );
}

function mockExecFileError(code: number, stderr: string) {
  mockedExecFile.mockImplementation(
    ((_file: string, _args: any, callback: any) => {
      if (typeof _args === 'function') {
        callback = _args;
        _args = [];
      }
      const err = new Error(stderr) as any;
      err.code = code;
      err.stderr = stderr;
      callback(err, '', stderr);
    }) as any,
  );
}

describe('fetchIssue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls ghExec with correct args for JSON view', async () => {
    const { fetchIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess(
      JSON.stringify({
        title: 'Fix auth timeout',
        body: 'When users have slow connections...',
        labels: [{ name: 'bug' }, { name: 'priority:high' }],
        url: 'https://github.com/owner/repo/issues/42',
      }),
    );

    await fetchIssue(42);

    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      ['issue', 'view', '42', '--json', 'title,body,labels,url'],
      expect.any(Function),
    );
  });

  it('returns structured IssueData with mapped labels', async () => {
    const { fetchIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess(
      JSON.stringify({
        title: 'Fix auth timeout',
        body: 'When users have slow connections...',
        labels: [{ name: 'bug' }, { name: 'priority:high' }],
        url: 'https://github.com/owner/repo/issues/42',
      }),
    );

    const result = await fetchIssue(42);

    expect(result).toEqual({
      number: 42,
      title: 'Fix auth timeout',
      body: 'When users have slow connections...',
      labels: ['bug', 'priority:high'],
      url: 'https://github.com/owner/repo/issues/42',
    });
  });

  it('handles empty labels array', async () => {
    const { fetchIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess(
      JSON.stringify({
        title: 'No labels issue',
        body: 'Body text',
        labels: [],
        url: 'https://github.com/owner/repo/issues/1',
      }),
    );

    const result = await fetchIssue(1);
    expect(result.labels).toEqual([]);
  });

  it('handles null labels gracefully', async () => {
    const { fetchIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess(
      JSON.stringify({
        title: 'Null labels issue',
        body: 'Body text',
        labels: null,
        url: 'https://github.com/owner/repo/issues/2',
      }),
    );

    const result = await fetchIssue(2);
    expect(result.labels).toEqual([]);
  });

  it('throws when ghExec fails', async () => {
    const { fetchIssue } = await import('../../src/github/issues.js');
    mockExecFileError(1, 'Could not resolve to a Repository');

    await expect(fetchIssue(999)).rejects.toThrow(
      'Could not resolve to a Repository',
    );
  });
});

describe('findFeatureByIssue', () => {
  it('finds feature by exact issue number match', async () => {
    const { findFeatureByIssue } = await import('../../src/workstream/create.js');
    const features = [
      { id: 'F-001', title: 'User Auth', issue: 42, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/user-auth', workstream: null, body: '', filename: 'F-001.md' },
      { id: 'F-002', title: 'Dashboard', issue: 43, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/dashboard', workstream: null, body: '', filename: 'F-002.md' },
    ];

    const result = findFeatureByIssue(features, 42, 'Different Title');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('F-001');
  });

  it('falls back to title similarity at 0.8 threshold when no exact match', async () => {
    const { findFeatureByIssue } = await import('../../src/workstream/create.js');
    const features = [
      { id: 'F-001', title: 'User Authentication', issue: null, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/user-auth', workstream: null, body: '', filename: 'F-001.md' },
    ];

    // Very similar title should match (same string = 1.0)
    const result = findFeatureByIssue(features, 99, 'User Authentication');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('F-001');
  });

  it('returns null when no feature matches', async () => {
    const { findFeatureByIssue } = await import('../../src/workstream/create.js');
    const features = [
      { id: 'F-001', title: 'User Auth', issue: 42, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/user-auth', workstream: null, body: '', filename: 'F-001.md' },
    ];

    const result = findFeatureByIssue(features, 99, 'Completely Different Title');
    expect(result).toBeNull();
  });

  it('returns null when features array is empty', async () => {
    const { findFeatureByIssue } = await import('../../src/workstream/create.js');
    const result = findFeatureByIssue([], 42, 'Some Title');
    expect(result).toBeNull();
  });

  it('prefers exact issue match over title similarity', async () => {
    const { findFeatureByIssue } = await import('../../src/workstream/create.js');
    const features = [
      { id: 'F-001', title: 'User Authentication', issue: null, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/user-auth', workstream: null, body: '', filename: 'F-001.md' },
      { id: 'F-002', title: 'Different Thing', issue: 42, status: 'unassigned' as const, milestone: 'M1', branch: 'feature/diff', workstream: null, body: '', filename: 'F-002.md' },
    ];

    // Exact issue match should win even though title similarity would match F-001
    const result = findFeatureByIssue(features, 42, 'User Authentication');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('F-002');
  });
});
