import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
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
    getCurrentBranch: vi.fn().mockResolvedValue('feature/my-branch'),
    getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
  })),
}));

import { statusHandler, StatusRow, StatusResult } from '../../src/workstream/status.js';
import { discoverWorkstreams } from '../../src/workstream/discover.js';
import { readMeta } from '../../src/state/meta.js';
import { readState } from '../../src/state/state.js';

const mockDiscover = vi.mocked(discoverWorkstreams);
const mockReadMeta = vi.mocked(readMeta);
const mockReadState = vi.mocked(readState);

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

describe('statusHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active workstreams with correct StatusRow fields', async () => {
    mockDiscover.mockResolvedValue(['ws-alpha']);
    mockReadMeta.mockResolvedValue(makeMeta({ workstreamId: 'ws-alpha', branch: 'feature/alpha' }));
    mockReadState.mockResolvedValue(makeState());

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result).not.toBeNull();
    expect(result!.rows).toHaveLength(1);
    const row = result!.rows[0];
    expect(row.id).toBe('ws-alpha');
    expect(row.branch).toBe('feature/alpha');
    expect(row.phase).toContain('Phase 1');
    expect(row.phase).toContain('plan');
    expect(row.status).toBe('active');
    expect(row.lastActivity).toBeDefined();
  });

  it('filters out archived workstreams by default', async () => {
    mockDiscover.mockResolvedValue(['ws-active', 'ws-archived']);
    mockReadMeta
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-active', status: 'active' }))
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-archived', status: 'archived' }));
    mockReadState.mockResolvedValue(makeState());

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result!.rows).toHaveLength(1);
    expect(result!.rows[0].id).toBe('ws-active');
  });

  it('includes archived workstreams when all=true', async () => {
    mockDiscover.mockResolvedValue(['ws-active', 'ws-archived']);
    mockReadMeta
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-active', status: 'active' }))
      .mockResolvedValueOnce(makeMeta({ workstreamId: 'ws-archived', status: 'archived' }));
    mockReadState.mockResolvedValue(makeState());

    const result = await statusHandler({ all: true, repoRoot: '/fake/repo' });

    expect(result!.rows).toHaveLength(2);
    expect(result!.rows.map((r) => r.id)).toContain('ws-archived');
  });

  it('shows "No phases" when workstream has no phases', async () => {
    mockDiscover.mockResolvedValue(['ws-empty']);
    mockReadMeta.mockResolvedValue(makeMeta({ workstreamId: 'ws-empty' }));
    mockReadState.mockResolvedValue(makeState({ phases: [], currentPhase: 0 }));

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result!.rows[0].phase).toBe('No phases');
  });

  it('returns currentBranch for highlighting', async () => {
    mockDiscover.mockResolvedValue(['ws-1']);
    mockReadMeta.mockResolvedValue(makeMeta());
    mockReadState.mockResolvedValue(makeState());

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result!.currentBranch).toBe('feature/my-branch');
  });

  it('returns null with empty workstreams', async () => {
    mockDiscover.mockResolvedValue([]);

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result).toBeNull();
  });

  it('determines correct in-progress step', async () => {
    mockDiscover.mockResolvedValue(['ws-exec']);
    mockReadMeta.mockResolvedValue(makeMeta({ workstreamId: 'ws-exec' }));
    mockReadState.mockResolvedValue(
      makeState({
        phases: [
          {
            number: 2,
            status: 'active',
            discuss: { status: 'complete' },
            plan: { status: 'complete' },
            execute: { status: 'in-progress' },
          },
        ],
        currentPhase: 2,
      }),
    );

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result!.rows[0].phase).toBe('Phase 2 / execute');
  });

  it('shows discuss when all steps are not-started', async () => {
    mockDiscover.mockResolvedValue(['ws-new']);
    mockReadMeta.mockResolvedValue(makeMeta({ workstreamId: 'ws-new' }));
    mockReadState.mockResolvedValue(
      makeState({
        phases: [
          {
            number: 1,
            status: 'active',
            discuss: { status: 'not-started' },
            plan: { status: 'not-started' },
            execute: { status: 'not-started' },
          },
        ],
        currentPhase: 1,
      }),
    );

    const result = await statusHandler({ repoRoot: '/fake/repo' });

    expect(result!.rows[0].phase).toBe('Phase 1 / discuss');
  });
});
