import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../src/phase/index.js', () => ({
  resolveCurrentWorkstream: vi.fn(),
}));

vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn().mockImplementation(() => ({
    getCurrentBranch: vi.fn(),
    getRepoRoot: vi.fn(),
  })),
}));

vi.mock('../../src/workstream/create.js', () => ({
  createWorkstream: vi.fn(),
}));

vi.mock('../../src/workstream/resolve.js', () => ({
  isProtectedBranch: vi.fn(),
}));

import { ensureWorkstream, promptYesNo } from '../../src/workstream/prompt.js';
import { resolveCurrentWorkstream } from '../../src/phase/index.js';
import { GitOps } from '../../src/git/index.js';
import { createWorkstream } from '../../src/workstream/create.js';
import { isProtectedBranch } from '../../src/workstream/resolve.js';

const mockedResolve = vi.mocked(resolveCurrentWorkstream);
const mockedIsProtected = vi.mocked(isProtectedBranch);
const mockedCreateWorkstream = vi.mocked(createWorkstream);

describe('promptYesNo', () => {
  const originalIsTTY = process.stdin.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
  });

  it('returns false when process.stdin.isTTY is falsy', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });
    const result = await promptYesNo('Create workstream?');
    expect(result).toBe(false);
  });
});

describe('ensureWorkstream', () => {
  let mockGetCurrentBranch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentBranch = vi.fn();
    vi.mocked(GitOps).mockImplementation(
      () =>
        ({
          getCurrentBranch: mockGetCurrentBranch,
          getRepoRoot: vi.fn(),
        }) as unknown as InstanceType<typeof GitOps>,
    );
  });

  it('returns existing workstream when resolveCurrentWorkstream finds one', async () => {
    mockedResolve.mockResolvedValue({ id: 'my-ws', path: '/tmp/ws' });

    const result = await ensureWorkstream('/repo');
    expect(result).toEqual({ id: 'my-ws', path: '/tmp/ws' });
    // Should not call GitOps or prompt
    expect(mockGetCurrentBranch).not.toHaveBeenCalled();
  });

  it('returns null on protected branch without prompting', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('main');
    mockedIsProtected.mockReturnValue(true);

    const result = await ensureWorkstream('/repo');
    expect(result).toBeNull();
    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
  });

  it('creates workstream when user confirms', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/new-thing');
    mockedIsProtected.mockReturnValue(false);
    mockedCreateWorkstream.mockResolvedValue({
      workstreamId: 'new-thing',
      branch: 'feature/new-thing',
      path: '/repo/.branchos/workstreams/new-thing',
      created: true,
    });

    // Mock promptYesNo to return true by mocking readline
    // We'll use the module's own promptYesNo, but we need to control stdin
    // Instead, we'll mock the module partially
    const promptModule = await import('../../src/workstream/prompt.js');
    const promptSpy = vi.spyOn(promptModule, 'promptYesNo').mockResolvedValue(true);

    const result = await promptModule.ensureWorkstream('/repo');
    expect(result).toEqual({ id: 'new-thing', path: '/repo/.branchos/workstreams/new-thing' });
    expect(mockedCreateWorkstream).toHaveBeenCalledWith({ repoRoot: '/repo' });

    promptSpy.mockRestore();
  });

  it('returns null when user declines', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/new-thing');
    mockedIsProtected.mockReturnValue(false);

    const promptModule = await import('../../src/workstream/prompt.js');
    const promptSpy = vi.spyOn(promptModule, 'promptYesNo').mockResolvedValue(false);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await promptModule.ensureWorkstream('/repo');
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Workstream required for this command.');
    expect(mockedCreateWorkstream).not.toHaveBeenCalled();

    promptSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('calls promptYesNo when no workstream found on non-protected branch', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/test');
    mockedIsProtected.mockReturnValue(false);

    const promptModule = await import('../../src/workstream/prompt.js');
    const promptSpy = vi.spyOn(promptModule, 'promptYesNo').mockResolvedValue(false);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await promptModule.ensureWorkstream('/repo');
    expect(promptSpy).toHaveBeenCalledWith(
      expect.stringContaining("No workstream for branch 'feature/test'"),
    );

    promptSpy.mockRestore();
  });
});
