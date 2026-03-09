import { describe, it, expect, vi, beforeEach } from 'vitest';

// ----- pure function tests (no mocks needed) -----
import { detectConflicts, WorkstreamFiles, FileConflict } from '../../src/workstream/conflicts.js';

describe('detectConflicts (pure)', () => {
  it('returns high severity when both workstreams have changed the same file', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: [], changed: ['src/foo.ts'] },
      { id: 'ws-b', planned: [], changed: ['src/foo.ts'] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(1);
    expect(result[0].file).toBe('src/foo.ts');
    expect(result[0].severity).toBe('high');
    expect(result[0].workstreams).toEqual([
      { id: 'ws-a', source: 'changed' },
      { id: 'ws-b', source: 'changed' },
    ]);
  });

  it('returns medium severity when one planned and one changed', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: ['src/bar.ts'], changed: [] },
      { id: 'ws-b', planned: [], changed: ['src/bar.ts'] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('medium');
    expect(result[0].workstreams).toEqual([
      { id: 'ws-a', source: 'planned' },
      { id: 'ws-b', source: 'changed' },
    ]);
  });

  it('returns medium severity when both planned', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: ['src/baz.ts'], changed: [] },
      { id: 'ws-b', planned: ['src/baz.ts'], changed: [] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('medium');
  });

  it('returns empty array when no overlap', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: ['src/a.ts'], changed: ['src/c.ts'] },
      { id: 'ws-b', planned: ['src/b.ts'], changed: ['src/d.ts'] },
    ];
    expect(detectConflicts(input)).toEqual([]);
  });

  it('deduplicates: prefers changed over planned for same workstream', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: ['src/dup.ts'], changed: ['src/dup.ts'] },
      { id: 'ws-b', planned: [], changed: ['src/dup.ts'] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('high');
    // ws-a should be 'changed' not 'planned'
    const wsA = result[0].workstreams.find((w) => w.id === 'ws-a');
    expect(wsA!.source).toBe('changed');
  });

  it('lists all three workstreams when they overlap on same file', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: [], changed: ['src/shared.ts'] },
      { id: 'ws-b', planned: [], changed: ['src/shared.ts'] },
      { id: 'ws-c', planned: ['src/shared.ts'], changed: [] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(1);
    expect(result[0].workstreams).toHaveLength(3);
    // medium because ws-c is planned
    expect(result[0].severity).toBe('medium');
  });

  it('sorts high before medium, then alphabetical by filename', () => {
    const input: WorkstreamFiles[] = [
      { id: 'ws-a', planned: ['src/beta.ts'], changed: ['src/alpha.ts'] },
      { id: 'ws-b', planned: ['src/beta.ts'], changed: ['src/alpha.ts'] },
    ];
    const result = detectConflicts(input);
    expect(result).toHaveLength(2);
    expect(result[0].file).toBe('src/alpha.ts');
    expect(result[0].severity).toBe('high');
    expect(result[1].file).toBe('src/beta.ts');
    expect(result[1].severity).toBe('medium');
  });

  it('returns empty array for empty inputs', () => {
    expect(detectConflicts([])).toEqual([]);
  });
});

// ----- gatherWorkstreamFiles tests (needs mocks) -----

vi.mock('../../src/workstream/discover.js', () => ({
  discoverWorkstreams: vi.fn(),
}));

vi.mock('../../src/state/meta.js', () => ({
  readMeta: vi.fn(),
}));

vi.mock('../../src/state/state.js', () => ({
  readState: vi.fn(),
}));

vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn().mockImplementation(() => ({
    getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
    getCurrentBranch: vi.fn().mockResolvedValue('feature/ws-a'),
    getChangedFilesForBranch: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../src/phase/drift.js', () => ({
  parseAffectedFiles: vi.fn().mockReturnValue([]),
}));

vi.mock('../../src/phase/index.js', () => ({
  resolveCurrentWorkstream: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('not found')),
}));

import { gatherWorkstreamFiles, detectConflictsHandler } from '../../src/workstream/conflicts.js';
import { readMeta } from '../../src/state/meta.js';
import { readState } from '../../src/state/state.js';
import { GitOps } from '../../src/git/index.js';
import { parseAffectedFiles } from '../../src/phase/drift.js';
import { resolveCurrentWorkstream } from '../../src/phase/index.js';
import { readFile } from 'fs/promises';

const mockReadMeta = vi.mocked(readMeta);
const mockReadState = vi.mocked(readState);
const mockGitOps = vi.mocked(GitOps);
const mockParseAffectedFiles = vi.mocked(parseAffectedFiles);
const mockResolveCurrentWorkstream = vi.mocked(resolveCurrentWorkstream);
const mockReadFile = vi.mocked(readFile);

function makeMeta(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    workstreamId: 'test-ws',
    branch: 'feature/test',
    status: 'active' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    ...overrides,
  };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    status: 'in-progress' as const,
    tasks: [],
    currentPhase: 1,
    phases: [
      {
        number: 1,
        status: 'active' as const,
        discuss: { status: 'complete' as const },
        plan: { status: 'in-progress' as const },
        execute: { status: 'not-started' as const },
      },
    ],
    ...overrides,
  };
}

describe('gatherWorkstreamFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gathers planned and changed files for a workstream', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ workstreamId: 'ws-a', branch: 'feature/ws-a' }));
    mockReadState.mockResolvedValue(makeState());
    mockReadFile.mockResolvedValue('# Plan\n## Affected Files\n- `src/foo.ts`\n' as never);
    mockParseAffectedFiles.mockReturnValue(['src/foo.ts']);

    const mockGetChangedFilesForBranch = vi.fn().mockResolvedValue(['src/bar.ts']);
    mockGitOps.mockImplementation(() => ({
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      getCurrentBranch: vi.fn().mockResolvedValue('feature/ws-a'),
      getChangedFilesForBranch: mockGetChangedFilesForBranch,
    }) as unknown as GitOps);

    const result = await gatherWorkstreamFiles({
      repoRoot: '/fake/repo',
      workstreamIds: ['ws-a'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ws-a');
    expect(result[0].planned).toContain('src/foo.ts');
    expect(result[0].changed).toContain('src/bar.ts');
  });

  it('skips archived workstreams by default', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ status: 'archived' }));

    const result = await gatherWorkstreamFiles({
      repoRoot: '/fake/repo',
      workstreamIds: ['ws-archived'],
    });

    expect(result).toHaveLength(0);
  });

  it('handles missing plan.md gracefully', async () => {
    mockReadMeta.mockResolvedValue(makeMeta({ branch: 'feature/x' }));
    mockReadState.mockResolvedValue(makeState());
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const mockGetChangedFilesForBranch = vi.fn().mockResolvedValue([]);
    mockGitOps.mockImplementation(() => ({
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      getCurrentBranch: vi.fn().mockResolvedValue('main'),
      getChangedFilesForBranch: mockGetChangedFilesForBranch,
    }) as unknown as GitOps);

    const result = await gatherWorkstreamFiles({
      repoRoot: '/fake/repo',
      workstreamIds: ['ws-noplan'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].planned).toEqual([]);
  });
});

describe('detectConflictsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and prints message when no conflicts found', async () => {
    mockResolveCurrentWorkstream.mockResolvedValue({ id: 'ws-a', path: '/fake/repo/.branchos/workstreams/ws-a' });

    mockGitOps.mockImplementation(() => ({
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      getCurrentBranch: vi.fn().mockResolvedValue('feature/ws-a'),
      getChangedFilesForBranch: vi.fn().mockResolvedValue([]),
    }) as unknown as GitOps);

    // Two workstreams with no overlap
    mockReadMeta
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-a', branch: 'feature/ws-a' }))
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-b', branch: 'feature/ws-b' }));
    mockReadState.mockResolvedValue(makeState());
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    // Mock discoverWorkstreams
    const { discoverWorkstreams } = await import('../../src/workstream/discover.js');
    vi.mocked(discoverWorkstreams).mockResolvedValue(['ws-a', 'ws-b']);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await detectConflictsHandler({ repoRoot: '/fake/repo' });

    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('outputs JSON when --json flag is set', async () => {
    mockResolveCurrentWorkstream.mockResolvedValue({ id: 'ws-a', path: '/fake/repo/.branchos/workstreams/ws-a' });

    mockGitOps.mockImplementation(() => ({
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      getCurrentBranch: vi.fn().mockResolvedValue('feature/ws-a'),
      getChangedFilesForBranch: vi.fn().mockResolvedValue([]),
    }) as unknown as GitOps);

    mockReadMeta
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-a', branch: 'feature/ws-a' }))
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-b', branch: 'feature/ws-b' }));
    mockReadState.mockResolvedValue(makeState());
    mockReadFile.mockRejectedValue(new Error('ENOENT'));

    const { discoverWorkstreams } = await import('../../src/workstream/discover.js');
    vi.mocked(discoverWorkstreams).mockResolvedValue(['ws-a', 'ws-b']);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await detectConflictsHandler({ json: true, repoRoot: '/fake/repo' });

    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try { JSON.parse(call[0]); return true; } catch { return false; }
    });
    expect(jsonCall).toBeDefined();
    consoleSpy.mockRestore();
  });
});
