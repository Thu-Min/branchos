import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock readline to control promptYesNo behavior
const mockQuestion = vi.fn();
const mockClose = vi.fn();
vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

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

  it('returns true when user types y', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => cb('y'));

    const result = await promptYesNo('Create?');
    expect(result).toBe(true);
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns false when user types n', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => cb('n'));

    const result = await promptYesNo('Create?');
    expect(result).toBe(false);
  });
});

describe('ensureWorkstream', () => {
  let mockGetCurrentBranch: ReturnType<typeof vi.fn>;
  const originalIsTTY = process.stdin.isTTY;

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
    // Default to TTY for ensureWorkstream tests
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true });
  });

  it('returns existing workstream when resolveCurrentWorkstream finds one', async () => {
    mockedResolve.mockResolvedValue({ id: 'my-ws', path: '/tmp/ws' });

    const result = await ensureWorkstream('/repo');
    expect(result).toEqual({ id: 'my-ws', path: '/tmp/ws' });
    expect(mockGetCurrentBranch).not.toHaveBeenCalled();
  });

  it('returns null on protected branch without prompting', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('main');
    mockedIsProtected.mockReturnValue(true);

    const result = await ensureWorkstream('/repo');
    expect(result).toBeNull();
    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
    expect(mockQuestion).not.toHaveBeenCalled();
  });

  it('creates workstream when user confirms', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/new-thing');
    mockedIsProtected.mockReturnValue(false);
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => cb('yes'));
    mockedCreateWorkstream.mockResolvedValue({
      workstreamId: 'new-thing',
      branch: 'feature/new-thing',
      path: '/repo/.branchos/workstreams/new-thing',
      created: true,
    });

    const result = await ensureWorkstream('/repo');
    expect(result).toEqual({ id: 'new-thing', path: '/repo/.branchos/workstreams/new-thing' });
    expect(mockedCreateWorkstream).toHaveBeenCalledWith({ repoRoot: '/repo' });
  });

  it('returns null when user declines', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/new-thing');
    mockedIsProtected.mockReturnValue(false);
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => cb('no'));

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await ensureWorkstream('/repo');
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Workstream required for this command.');
    expect(mockedCreateWorkstream).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('calls promptYesNo when no workstream found on non-protected branch', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/test');
    mockedIsProtected.mockReturnValue(false);
    mockQuestion.mockImplementation((_q: string, cb: (answer: string) => void) => cb('n'));
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await ensureWorkstream('/repo');
    expect(mockQuestion).toHaveBeenCalledWith(
      expect.stringContaining("No workstream for branch 'feature/test'"),
      expect.any(Function),
    );
  });

  it('returns null in non-TTY environment without prompting', async () => {
    mockedResolve.mockResolvedValue(null);
    mockGetCurrentBranch.mockResolvedValue('feature/test');
    mockedIsProtected.mockReturnValue(false);
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await ensureWorkstream('/repo');
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('Workstream required for this command.');
    expect(mockQuestion).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
