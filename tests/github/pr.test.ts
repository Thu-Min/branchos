import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedAcceptanceCriteria } from '../../src/roadmap/gwt-parser.js';

// Mock child_process before importing modules
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return {
    ...actual,
    tmpdir: vi.fn(() => '/tmp'),
  };
});

const { execFile } = await import('child_process');
const { writeFileSync, unlinkSync } = await import('fs');
const { tmpdir } = await import('os');

const mockedExecFile = vi.mocked(execFile);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedUnlinkSync = vi.mocked(unlinkSync);
const mockedTmpdir = vi.mocked(tmpdir);

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

describe('assemblePrBody', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns all three sections joined when description + GWT + issue provided', async () => {
    const { assemblePrBody } = await import('../../src/github/pr.js');
    const parsed: ParsedAcceptanceCriteria = {
      gwtBlocks: [{
        id: 'AC-1',
        steps: [
          { keyword: 'Given', text: 'a user is logged in' },
          { keyword: 'When', text: 'they click submit' },
          { keyword: 'Then', text: 'the form is saved' },
        ],
      }],
      freeformItems: [],
    };

    const result = assemblePrBody({
      featureId: 'F-01',
      featureTitle: 'Test Feature',
      featureDescription: 'This is the feature description.',
      parsedCriteria: parsed,
      issueNumber: 42,
    });

    expect(result).toContain('This is the feature description.');
    expect(result).toContain('## Acceptance Criteria');
    expect(result).toContain('AC-1');
    expect(result).toContain('Closes #42');
  });

  it('omits Closes line when issueNumber is null', async () => {
    const { assemblePrBody } = await import('../../src/github/pr.js');
    const parsed: ParsedAcceptanceCriteria = {
      gwtBlocks: [{
        id: 'AC-1',
        steps: [
          { keyword: 'Given', text: 'setup' },
          { keyword: 'When', text: 'action' },
          { keyword: 'Then', text: 'result' },
        ],
      }],
      freeformItems: [],
    };

    const result = assemblePrBody({
      featureId: 'F-01',
      featureTitle: 'Test Feature',
      featureDescription: 'Description here.',
      parsedCriteria: parsed,
      issueNumber: null,
    });

    expect(result).not.toContain('Closes');
  });

  it('omits description section when featureDescription is empty', async () => {
    const { assemblePrBody } = await import('../../src/github/pr.js');
    const parsed: ParsedAcceptanceCriteria = {
      gwtBlocks: [{
        id: 'AC-1',
        steps: [
          { keyword: 'Given', text: 'setup' },
          { keyword: 'When', text: 'action' },
          { keyword: 'Then', text: 'result' },
        ],
      }],
      freeformItems: [],
    };

    const result = assemblePrBody({
      featureId: 'F-01',
      featureTitle: 'Test Feature',
      featureDescription: '',
      parsedCriteria: parsed,
      issueNumber: 42,
    });

    // Should start with acceptance criteria, not an empty description
    expect(result).toMatch(/^## Acceptance Criteria/);
    expect(result).toContain('Closes #42');
  });

  it('omits checklist section when GWT criteria are empty', async () => {
    const { assemblePrBody } = await import('../../src/github/pr.js');
    const parsed: ParsedAcceptanceCriteria = {
      gwtBlocks: [],
      freeformItems: [],
    };

    const result = assemblePrBody({
      featureId: 'F-01',
      featureTitle: 'Test Feature',
      featureDescription: 'Just a description.',
      parsedCriteria: parsed,
      issueNumber: 42,
    });

    expect(result).not.toContain('## Acceptance Criteria');
    expect(result).toContain('Just a description.');
    expect(result).toContain('Closes #42');
  });

  it('renders checklist with only freeform criteria', async () => {
    const { assemblePrBody } = await import('../../src/github/pr.js');
    const parsed: ParsedAcceptanceCriteria = {
      gwtBlocks: [],
      freeformItems: [{ text: 'Must handle errors gracefully' }],
    };

    const result = assemblePrBody({
      featureId: 'F-01',
      featureTitle: 'Test Feature',
      featureDescription: 'Description.',
      parsedCriteria: parsed,
      issueNumber: null,
    });

    expect(result).toContain('## Acceptance Criteria');
    expect(result).toContain('Must handle errors gracefully');
  });
});

describe('checkExistingPr', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns {number, url} when PR exists for branch', async () => {
    const { checkExistingPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess(JSON.stringify([{
      number: 15,
      url: 'https://github.com/owner/repo/pull/15',
    }]));

    const result = await checkExistingPr('feature/my-branch');

    expect(result).toEqual({
      number: 15,
      url: 'https://github.com/owner/repo/pull/15',
    });
    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      ['pr', 'list', '--head', 'feature/my-branch', '--json', 'number,url'],
      expect.any(Function),
    );
  });

  it('returns null when no PR exists', async () => {
    const { checkExistingPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess(JSON.stringify([]));

    const result = await checkExistingPr('feature/no-pr');
    expect(result).toBeNull();
  });
});

describe('createPr', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedTmpdir.mockReturnValue('/tmp');
  });

  it('writes body to temp file, calls gh pr create with --body-file --base --title, cleans up', async () => {
    const { createPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess('https://github.com/owner/repo/pull/20');

    const result = await createPr({
      title: '[F-01] Test Feature',
      body: 'PR body content',
      baseBranch: 'main',
      assignee: null,
    });

    expect(result).toBe('https://github.com/owner/repo/pull/20');
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/branchos-pr-body-'),
      'PR body content',
      'utf-8',
    );
    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['pr', 'create', '--title', '[F-01] Test Feature', '--body-file', expect.stringContaining('/tmp/branchos-pr-body-'), '--base', 'main']),
      expect.any(Function),
    );
    expect(mockedUnlinkSync).toHaveBeenCalled();
  });

  it('passes --assignee when assignee provided', async () => {
    const { createPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess('https://github.com/owner/repo/pull/21');

    await createPr({
      title: '[F-01] Test',
      body: 'Body',
      baseBranch: 'main',
      assignee: 'octocat',
    });

    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['--assignee', 'octocat']),
      expect.any(Function),
    );
  });

  it('omits --assignee when assignee is null', async () => {
    const { createPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess('https://github.com/owner/repo/pull/22');

    await createPr({
      title: '[F-01] Test',
      body: 'Body',
      baseBranch: 'main',
      assignee: null,
    });

    const callArgs = mockedExecFile.mock.calls[0][1] as string[];
    expect(callArgs).not.toContain('--assignee');
  });

  it('returns the PR URL from gh stdout', async () => {
    const { createPr } = await import('../../src/github/pr.js');
    mockExecFileSuccess('https://github.com/owner/repo/pull/25\n');

    const result = await createPr({
      title: 'Test',
      body: 'Body',
      baseBranch: 'main',
      assignee: null,
    });

    expect(result).toBe('https://github.com/owner/repo/pull/25');
  });

  it('cleans up temp file even when ghExec fails', async () => {
    const { createPr } = await import('../../src/github/pr.js');
    mockExecFileError(1, 'gh error');

    await expect(createPr({
      title: 'Test',
      body: 'Body',
      baseBranch: 'main',
      assignee: null,
    })).rejects.toThrow();

    expect(mockedUnlinkSync).toHaveBeenCalled();
  });
});

describe('getDefaultBranch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses gh repo view JSON and returns branch name', async () => {
    const { getDefaultBranch } = await import('../../src/github/pr.js');
    mockExecFileSuccess(JSON.stringify({ defaultBranchRef: { name: 'main' } }));

    const result = await getDefaultBranch();

    expect(result).toBe('main');
    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      ['repo', 'view', '--json', 'defaultBranchRef'],
      expect.any(Function),
    );
  });
});

const sharedMockGit = vi.hoisted(() => ({
  revparse: vi.fn().mockResolvedValue('.git'),
  branchLocal: vi.fn().mockResolvedValue({ current: 'main', all: ['main'], detached: false }),
  raw: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  status: vi.fn(),
  checkout: vi.fn(),
  checkoutLocalBranch: vi.fn(),
}));

vi.mock('simple-git', () => ({
  default: () => sharedMockGit,
}));

describe('GitOps extensions', () => {

  beforeEach(() => {
    sharedMockGit.raw.mockReset();
  });

  it('getCommitsAhead returns count of commits ahead of base branch', async () => {
    sharedMockGit.raw.mockResolvedValue('5\n');

    const { GitOps } = await import('../../src/git/index.js');
    const git = new GitOps();
    const result = await git.getCommitsAhead('main');
    expect(result).toBe(5);
  });

  it('getCommitsAhead returns 0 when at same commit as base', async () => {
    sharedMockGit.raw.mockResolvedValue('0\n');

    const { GitOps } = await import('../../src/git/index.js');
    const git = new GitOps();
    const result = await git.getCommitsAhead('main');
    expect(result).toBe(0);
  });

  it('getCommitsAhead returns -1 on error', async () => {
    sharedMockGit.raw.mockRejectedValue(new Error('git error'));

    const { GitOps } = await import('../../src/git/index.js');
    const git = new GitOps();
    const result = await git.getCommitsAhead('main');
    expect(result).toBe(-1);
  });

  it('push calls git push -u origin HEAD', async () => {
    sharedMockGit.raw.mockResolvedValue('');

    const { GitOps } = await import('../../src/git/index.js');
    const git = new GitOps();
    await git.push();
    expect(sharedMockGit.raw).toHaveBeenCalledWith(['push', '-u', 'origin', 'HEAD']);
  });
});
