import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/state/meta.js', () => ({
  readMeta: vi.fn(),
  writeMeta: vi.fn(),
}));

vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn().mockImplementation(() => ({
    getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
    isBranchMerged: vi.fn().mockResolvedValue(true),
    addAndCommit: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { archiveHandler, unarchiveHandler } from '../../src/workstream/archive.js';
import { readMeta, writeMeta } from '../../src/state/meta.js';
import { GitOps } from '../../src/git/index.js';

const mockReadMeta = vi.mocked(readMeta);
const mockWriteMeta = vi.mocked(writeMeta);

function makeMeta(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    workstreamId: 'test-ws',
    branch: 'feature/test',
    status: 'active' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('archiveHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteMeta.mockResolvedValue(undefined);
  });

  it('sets status to archived and updates updatedAt', async () => {
    mockReadMeta.mockResolvedValue(makeMeta());

    await archiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' });

    expect(mockWriteMeta).toHaveBeenCalledTimes(1);
    const written = mockWriteMeta.mock.calls[0][1];
    expect(written.status).toBe('archived');
    expect(written.updatedAt).not.toBe('2026-01-01T00:00:00Z');
  });

  it('errors on already-archived workstream without --force', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'archived' }));

    await expect(
      archiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' }),
    ).rejects.toThrow(/already archived/i);
  });

  it('warns and blocks on unmerged branch without --force', async () => {
    mockReadMeta.mockResolvedValue(makeMeta());
    // Make isBranchMerged return false
    const mockGitInstance = {
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      isBranchMerged: vi.fn().mockResolvedValue(false),
      addAndCommit: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(GitOps).mockImplementationOnce(() => mockGitInstance as unknown as GitOps);

    await expect(
      archiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' }),
    ).rejects.toThrow(/not merged/i);
  });

  it('skips merge check with --force', async () => {
    mockReadMeta.mockResolvedValue(makeMeta());

    await archiveHandler({ workstreamId: 'test-ws', force: true, repoRoot: '/fake/repo' });

    expect(mockWriteMeta).toHaveBeenCalledTimes(1);
    const written = mockWriteMeta.mock.calls[0][1];
    expect(written.status).toBe('archived');
  });

  it('allows re-archiving already-archived with --force', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'archived' }));

    await archiveHandler({ workstreamId: 'test-ws', force: true, repoRoot: '/fake/repo' });

    expect(mockWriteMeta).toHaveBeenCalledTimes(1);
  });

  it('auto-commits via GitOps', async () => {
    mockReadMeta.mockResolvedValue(makeMeta());

    await archiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' });

    const gitInstance = vi.mocked(GitOps).mock.results[0].value;
    expect(gitInstance.addAndCommit).toHaveBeenCalled();
  });
});

describe('unarchiveHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteMeta.mockResolvedValue(undefined);
  });

  it('sets status to active and updates updatedAt', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'archived' }));

    await unarchiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' });

    expect(mockWriteMeta).toHaveBeenCalledTimes(1);
    const written = mockWriteMeta.mock.calls[0][1];
    expect(written.status).toBe('active');
    expect(written.updatedAt).not.toBe('2026-01-01T00:00:00Z');
  });

  it('errors on already-active workstream', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'active' }));

    await expect(
      unarchiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' }),
    ).rejects.toThrow(/already active/i);
  });

  it('auto-commits via GitOps', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'archived' }));

    await unarchiveHandler({ workstreamId: 'test-ws', repoRoot: '/fake/repo' });

    const gitInstance = vi.mocked(GitOps).mock.results[0].value;
    expect(gitInstance.addAndCommit).toHaveBeenCalled();
  });
});
