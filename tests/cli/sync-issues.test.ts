import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before imports
vi.mock('../../src/github/index.js', () => ({
  checkGhAvailable: vi.fn(),
}));

vi.mock('../../src/github/issues.js', () => ({
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
}));

vi.mock('../../src/github/milestones.js', () => ({
  ensureMilestone: vi.fn(),
}));

vi.mock('../../src/github/labels.js', () => ({
  ensureStatusLabels: vi.fn(),
}));

vi.mock('../../src/roadmap/feature-file.js', () => ({
  readAllFeatures: vi.fn(),
  writeFeatureFile: vi.fn(),
}));

vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn().mockImplementation(() => ({
    isGitRepo: vi.fn().mockResolvedValue(true),
    getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
    addAndCommit: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import mocked modules
const { checkGhAvailable } = await import('../../src/github/index.js');
const { createIssue, updateIssue } = await import('../../src/github/issues.js');
const { ensureMilestone } = await import('../../src/github/milestones.js');
const { ensureStatusLabels } = await import('../../src/github/labels.js');
const { readAllFeatures, writeFeatureFile } = await import('../../src/roadmap/feature-file.js');
const { GitOps } = await import('../../src/git/index.js');

const mockedCheckGh = vi.mocked(checkGhAvailable);
const mockedCreateIssue = vi.mocked(createIssue);
const mockedUpdateIssue = vi.mocked(updateIssue);
const mockedEnsureMilestone = vi.mocked(ensureMilestone);
const mockedEnsureStatusLabels = vi.mocked(ensureStatusLabels);
const mockedReadAllFeatures = vi.mocked(readAllFeatures);
const mockedWriteFeatureFile = vi.mocked(writeFeatureFile);

import type { Feature } from '../../src/roadmap/types.js';

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'F-001',
    title: 'Test Feature',
    status: 'unassigned',
    milestone: 'M1',
    branch: 'feature/test',
    issue: null,
    workstream: null,
    body: '## Acceptance Criteria\n\n- [ ] It works',
    filename: 'F-001-test-feature.md',
    ...overrides,
  };
}

describe('syncIssuesHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default happy-path mocks
    mockedCheckGh.mockResolvedValue({ available: true, authenticated: true });
    mockedEnsureStatusLabels.mockResolvedValue(undefined);
    mockedEnsureMilestone.mockResolvedValue(undefined);
    mockedWriteFeatureFile.mockResolvedValue('/fake/repo/.branchos/shared/features/F-001.md');

    // Reset GitOps mock
    vi.mocked(GitOps).mockImplementation(() => ({
      isGitRepo: vi.fn().mockResolvedValue(true),
      getRepoRoot: vi.fn().mockResolvedValue('/fake/repo'),
      addAndCommit: vi.fn().mockResolvedValue(undefined),
    }) as any);
  });

  it('fails when gh is not available', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedCheckGh.mockResolvedValue({ available: false, authenticated: false });
    mockedReadAllFeatures.mockResolvedValue([makeFeature()]);

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/gh.*install/i);
  });

  it('fails when gh is not authenticated', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedCheckGh.mockResolvedValue({ available: true, authenticated: false });
    mockedReadAllFeatures.mockResolvedValue([makeFeature()]);

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/auth/i);
  });

  it('skips complete and dropped features', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', status: 'complete', issue: 10 }),
      makeFeature({ id: 'F-002', status: 'dropped', issue: 11 }),
      makeFeature({ id: 'F-003', status: 'unassigned' }),
    ]);
    mockedCreateIssue.mockResolvedValue({ number: 1, url: 'https://github.com/o/r/issues/1' });

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(2);
    expect(result.created).toBe(1);
  });

  it('creates issue for feature with null issue number and stores returned number', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', issue: null }),
    ]);
    mockedCreateIssue.mockResolvedValue({ number: 42, url: 'https://github.com/o/r/issues/42' });

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(true);
    expect(result.created).toBe(1);
    expect(result.issues[0].issueNumber).toBe(42);
    expect(result.issues[0].action).toBe('created');
    // Should have written feature file with updated issue number
    expect(mockedWriteFeatureFile).toHaveBeenCalled();
    const writtenFeature = mockedWriteFeatureFile.mock.calls[0][1] as Feature;
    expect(writtenFeature.issue).toBe(42);
  });

  it('updates issue for feature with existing issue number', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', issue: 42, status: 'in-progress' }),
    ]);

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.issues[0].action).toBe('updated');
    expect(mockedUpdateIssue).toHaveBeenCalledWith(42, expect.objectContaining({
      addLabels: expect.arrayContaining(['in-progress']),
    }));
  });

  it('builds issue body with dependency cross-references', async () => {
    const { buildIssueBody } = await import('../../src/cli/sync-issues.js');
    const features: Feature[] = [
      makeFeature({ id: 'F-001', issue: 10 }),
      makeFeature({ id: 'F-002', issue: 20, dependsOn: ['F-001'] }),
    ];
    const body = buildIssueBody(features[1], features);
    expect(body).toContain('Dependencies');
    expect(body).toContain('#10');
    expect(body).toContain('F-001');
  });

  it('dry-run does not call createIssue or updateIssue', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', issue: null }),
      makeFeature({ id: 'F-002', issue: 5, status: 'assigned' }),
    ]);

    const result = await syncIssuesHandler({ json: true, dryRun: true, force: false });
    expect(result.success).toBe(true);
    expect(mockedCreateIssue).not.toHaveBeenCalled();
    expect(mockedUpdateIssue).not.toHaveBeenCalled();
    expect(mockedWriteFeatureFile).not.toHaveBeenCalled();
  });

  it('auto-commits feature files after sync', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', issue: null }),
    ]);
    mockedCreateIssue.mockResolvedValue({ number: 1, url: 'https://github.com/o/r/issues/1' });

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.success).toBe(true);

    // Check that GitOps addAndCommit was called
    const gitInstance = vi.mocked(GitOps).mock.results[0]?.value;
    expect(gitInstance.addAndCommit).toHaveBeenCalled();
  });

  it('summary output has correct created/updated/skipped counts', async () => {
    const { syncIssuesHandler } = await import('../../src/cli/sync-issues.js');
    mockedReadAllFeatures.mockResolvedValue([
      makeFeature({ id: 'F-001', issue: null, status: 'unassigned' }),
      makeFeature({ id: 'F-002', issue: 5, status: 'assigned' }),
      makeFeature({ id: 'F-003', status: 'complete', issue: 10 }),
    ]);
    mockedCreateIssue.mockResolvedValue({ number: 99, url: 'https://github.com/o/r/issues/99' });

    const result = await syncIssuesHandler({ json: true, dryRun: false, force: false });
    expect(result.created).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.issues).toHaveLength(3);
  });
});
