import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the createWorkstream module
vi.mock('../../src/workstream/create.js', () => ({
  createWorkstream: vi.fn(),
}));

// Mock GitOps
vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn().mockImplementation(() => ({
    isGitRepo: vi.fn().mockResolvedValue(true),
    getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
  })),
}));

// Mock output
vi.mock('../../src/output/index.js', () => ({
  output: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

const { createWorkstream } = await import('../../src/workstream/create.js');
const mockedCreateWorkstream = vi.mocked(createWorkstream);

const { error: errorFn, success: successFn } = await import('../../src/output/index.js');
const mockedError = vi.mocked(errorFn);
const mockedSuccess = vi.mocked(successFn);

import { Command } from 'commander';
import { registerWorkstreamCommands } from '../../src/cli/workstream.js';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerWorkstreamCommands(program);
  return program;
}

describe('--issue flag', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateWorkstream.mockResolvedValue({
      workstreamId: 'auth-timeout',
      branch: 'feature/auth-timeout',
      path: '/fake/repo/.branchos/workstreams/auth-timeout',
      created: true,
      featureId: 'F-001',
    });
    // Mock process.exit to throw so we can catch it
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('--issue 42 parses correctly and passes issueNumber', async () => {
    // Don't mock exit for the success path
    exitSpy.mockRestore();

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', '42']);

    expect(mockedCreateWorkstream).toHaveBeenCalledWith(
      expect.objectContaining({ issueNumber: 42 }),
    );
  });

  it('--issue #42 strips # and parses to 42', async () => {
    exitSpy.mockRestore();

    const program = buildProgram();
    await program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', '#42']);

    expect(mockedCreateWorkstream).toHaveBeenCalledWith(
      expect.objectContaining({ issueNumber: 42 }),
    );
  });

  it('--issue 0 produces validation error', async () => {
    const program = buildProgram();

    await expect(
      program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', '0']),
    ).rejects.toThrow();

    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
    expect(mockedError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid issue number'),
      expect.anything(),
    );
  });

  it('--issue abc produces validation error', async () => {
    const program = buildProgram();

    await expect(
      program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', 'abc']),
    ).rejects.toThrow();

    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
    expect(mockedError).toHaveBeenCalledWith(
      expect.stringContaining('Invalid issue number'),
      expect.anything(),
    );
  });

  it('--issue -5 produces validation error', async () => {
    const program = buildProgram();

    await expect(
      program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', '-5']),
    ).rejects.toThrow();

    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
  });

  it('--issue 42 --feature F-001 produces mutual exclusivity error', async () => {
    const program = buildProgram();

    await expect(
      program.parseAsync(['node', 'test', 'workstream', 'create', '--issue', '42', '--feature', 'F-001']),
    ).rejects.toThrow();

    expect(mockedCreateWorkstream).not.toHaveBeenCalled();
    expect(mockedError).toHaveBeenCalledWith(
      expect.stringContaining('Cannot use --issue and --feature together'),
      expect.anything(),
    );
  });
});
