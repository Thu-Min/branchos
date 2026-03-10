import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFile as realExecFile } from 'child_process';

// Mock child_process before importing modules
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

// We need to import after mock setup
const { execFile } = await import('child_process');
const mockedExecFile = vi.mocked(execFile);

// Helper to make execFile resolve/reject
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

describe('checkGhAvailable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns available:false when gh not found', async () => {
    const { checkGhAvailable } = await import('../../src/github/index.js');
    mockExecFileError(127, 'command not found');
    const result = await checkGhAvailable();
    expect(result).toEqual({ available: false, authenticated: false });
  });

  it('returns available:true, authenticated:false when gh found but not authed', async () => {
    const { checkGhAvailable } = await import('../../src/github/index.js');
    // First call: gh --version succeeds
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        callback(null, 'gh version 2.40.0', '');
      }) as any,
    );
    // Second call: gh auth status fails
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        const err = new Error('not logged in') as any;
        err.code = 1;
        err.stderr = 'not logged in';
        callback(err, '', 'not logged in');
      }) as any,
    );

    const result = await checkGhAvailable();
    expect(result).toEqual({ available: true, authenticated: false });
  });

  it('returns available:true, authenticated:true when gh authed', async () => {
    const { checkGhAvailable } = await import('../../src/github/index.js');
    // gh --version succeeds
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        callback(null, 'gh version 2.40.0', '');
      }) as any,
    );
    // gh auth status succeeds
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        callback(null, 'Logged in to github.com', '');
      }) as any,
    );

    const result = await checkGhAvailable();
    expect(result).toEqual({ available: true, authenticated: true });
  });
});

describe('ghExec', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls execFile with args array for shell injection safety', async () => {
    const { ghExec } = await import('../../src/github/index.js');
    mockExecFileSuccess('output data');
    await ghExec(['issue', 'list']);
    expect(mockedExecFile).toHaveBeenCalledWith(
      'gh',
      ['issue', 'list'],
      expect.any(Function),
    );
  });

  it('returns trimmed stdout', async () => {
    const { ghExec } = await import('../../src/github/index.js');
    mockExecFileSuccess('  some output  \n');
    const result = await ghExec(['version']);
    expect(result).toBe('some output');
  });

  it('throws on non-zero exit with stderr message', async () => {
    const { ghExec } = await import('../../src/github/index.js');
    mockExecFileError(1, 'authentication required');
    await expect(ghExec(['auth', 'status'])).rejects.toThrow(
      'authentication required',
    );
  });
});

describe('createIssue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parses issue number from URL in stdout', async () => {
    const { createIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess('https://github.com/owner/repo/issues/42\n');
    const result = await createIssue({
      title: 'Test issue',
      body: 'Body text',
      labels: ['bug'],
    });
    expect(result).toEqual({
      number: 42,
      url: 'https://github.com/owner/repo/issues/42',
    });
  });

  it('passes --title, --body, --label, --milestone flags correctly', async () => {
    const { createIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess('https://github.com/o/r/issues/1\n');
    await createIssue({
      title: 'My Issue',
      body: 'Description',
      labels: ['bug', 'enhancement'],
      milestone: 'v1.0',
    });
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args).toContain('issue');
    expect(args).toContain('create');
    expect(args).toContain('--title');
    expect(args).toContain('My Issue');
    expect(args).toContain('--body');
    expect(args).toContain('Description');
    // Each label gets its own --label flag
    const labelIndices = args.reduce<number[]>((acc, v, i) => {
      if (v === '--label') acc.push(i);
      return acc;
    }, []);
    expect(labelIndices.length).toBe(2);
    expect(args).toContain('--milestone');
    expect(args).toContain('v1.0');
  });
});

describe('updateIssue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('builds args with --add-label and --remove-label', async () => {
    const { updateIssue } = await import('../../src/github/issues.js');
    mockExecFileSuccess('');
    await updateIssue(42, {
      addLabels: ['in-progress'],
      removeLabels: ['unassigned'],
    });
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args).toContain('issue');
    expect(args).toContain('edit');
    expect(args).toContain('42');
    expect(args).toContain('--add-label');
    expect(args).toContain('in-progress');
    expect(args).toContain('--remove-label');
    expect(args).toContain('unassigned');
  });
});

describe('ensureLabel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses --force flag for idempotency', async () => {
    const { ensureLabel } = await import('../../src/github/labels.js');
    mockExecFileSuccess('');
    await ensureLabel('bug', 'FF0000');
    const args = mockedExecFile.mock.calls[0][1] as string[];
    expect(args).toContain('label');
    expect(args).toContain('create');
    expect(args).toContain('--force');
    expect(args).toContain('--color');
    expect(args).toContain('FF0000');
    expect(args).toContain('bug');
  });
});

describe('ensureMilestone', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not create milestone if it already exists', async () => {
    const { ensureMilestone } = await import('../../src/github/milestones.js');
    // First call: list milestones - includes our title
    mockExecFileSuccess('v1.0\nv2.0\n');
    await ensureMilestone('v1.0');
    // Should only have one call (the list), not a create
    expect(mockedExecFile).toHaveBeenCalledTimes(1);
  });

  it('creates milestone if missing', async () => {
    const { ensureMilestone } = await import('../../src/github/milestones.js');
    // First call: list milestones - doesn't include our title
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        callback(null, 'v1.0\n', '');
      }) as any,
    );
    // Second call: create milestone succeeds
    mockedExecFile.mockImplementationOnce(
      ((_file: string, _args: any, callback: any) => {
        callback(null, '{}', '');
      }) as any,
    );

    await ensureMilestone('v2.0');
    expect(mockedExecFile).toHaveBeenCalledTimes(2);
    const createArgs = mockedExecFile.mock.calls[1][1] as string[];
    expect(createArgs).toContain('--method');
    expect(createArgs).toContain('POST');
  });
});

describe('FEATURE_STATUSES', () => {
  it("includes 'dropped' as a valid status", async () => {
    const { FEATURE_STATUSES } = await import('../../src/roadmap/types.js');
    expect(FEATURE_STATUSES).toContain('dropped');
  });
});
