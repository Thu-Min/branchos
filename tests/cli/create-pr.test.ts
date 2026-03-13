import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('../../src/git/index.js', () => ({
  GitOps: vi.fn(),
}));

vi.mock('../../src/github/index.js', () => ({
  checkGhAvailable: vi.fn(),
  captureAssignee: vi.fn(),
  ghExec: vi.fn(),
}));

vi.mock('../../src/github/pr.js', () => ({
  checkExistingPr: vi.fn(),
  createPr: vi.fn(),
  getDefaultBranch: vi.fn(),
  assemblePrBody: vi.fn(),
}));

vi.mock('../../src/state/meta.js', () => ({
  readMeta: vi.fn(),
}));

vi.mock('../../src/roadmap/feature-file.js', () => ({
  readAllFeatures: vi.fn(),
}));

vi.mock('../../src/roadmap/gwt-parser.js', () => ({
  parseAcceptanceCriteria: vi.fn(),
  formatGwtChecklist: vi.fn(),
}));

vi.mock('../../src/phase/index.js', () => ({
  resolveCurrentWorkstream: vi.fn(),
}));

const { GitOps } = await import('../../src/git/index.js');
const { checkGhAvailable, captureAssignee, ghExec } = await import('../../src/github/index.js');
const { checkExistingPr, createPr, getDefaultBranch, assemblePrBody } = await import('../../src/github/pr.js');
const { readMeta } = await import('../../src/state/meta.js');
const { readAllFeatures } = await import('../../src/roadmap/feature-file.js');
const { parseAcceptanceCriteria } = await import('../../src/roadmap/gwt-parser.js');
const { resolveCurrentWorkstream } = await import('../../src/phase/index.js');

const mockedCheckGhAvailable = vi.mocked(checkGhAvailable);
const mockedCaptureAssignee = vi.mocked(captureAssignee);
const mockedCheckExistingPr = vi.mocked(checkExistingPr);
const mockedCreatePr = vi.mocked(createPr);
const mockedGetDefaultBranch = vi.mocked(getDefaultBranch);
const mockedAssemblePrBody = vi.mocked(assemblePrBody);
const mockedReadMeta = vi.mocked(readMeta);
const mockedReadAllFeatures = vi.mocked(readAllFeatures);
const mockedParseAcceptanceCriteria = vi.mocked(parseAcceptanceCriteria);
const mockedResolveCurrentWorkstream = vi.mocked(resolveCurrentWorkstream);
const mockedGhExec = vi.mocked(ghExec);

// Setup mock GitOps instance
const mockGitOpsInstance = {
  isGitRepo: vi.fn(),
  getCurrentBranch: vi.fn(),
  getRepoRoot: vi.fn(),
  getCommitsAhead: vi.fn(),
  push: vi.fn(),
};

function resetMockGitOps() {
  mockGitOpsInstance.isGitRepo.mockResolvedValue(true);
  mockGitOpsInstance.getCurrentBranch.mockResolvedValue('feature/my-branch');
  mockGitOpsInstance.getRepoRoot.mockResolvedValue('/repo');
  mockGitOpsInstance.getCommitsAhead.mockResolvedValue(3);
  mockGitOpsInstance.push.mockResolvedValue(undefined);
  (GitOps as any).mockImplementation(() => mockGitOpsInstance);
}

function setupHappyPath() {
  mockedCheckGhAvailable.mockResolvedValue({ available: true, authenticated: true });
  mockedResolveCurrentWorkstream.mockResolvedValue({
    id: 'ws-1',
    path: '/repo/.branchos/workstreams/ws-1',
  });
  mockedReadMeta.mockResolvedValue({
    schemaVersion: 2,
    workstreamId: 'ws-1',
    branch: 'feature/my-branch',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    assignee: 'octocat',
    issueNumber: 42,
    featureId: 'F-01',
  });
  mockedReadAllFeatures.mockResolvedValue([{
    id: 'F-01',
    title: 'Create PR Command',
    status: 'in-progress',
    milestone: 'M1',
    branch: 'feature/my-branch',
    issue: 42,
    workstream: 'ws-1',
    body: 'Feature description here.\n\n## Acceptance Criteria\n\n### AC-1\nGiven a user\nWhen they act\nThen result',
    filename: 'F-01.md',
  }]);
  mockedGetDefaultBranch.mockResolvedValue('main');
  mockGitOpsInstance.getCommitsAhead.mockResolvedValue(3);
  mockedCheckExistingPr.mockResolvedValue(null);
  mockedParseAcceptanceCriteria.mockReturnValue({
    gwtBlocks: [{ id: 'AC-1', steps: [
      { keyword: 'Given', text: 'a user' },
      { keyword: 'When', text: 'they act' },
      { keyword: 'Then', text: 'result' },
    ]}],
    freeformItems: [],
  });
  mockedAssemblePrBody.mockReturnValue('Feature description here.\n\n## Acceptance Criteria\n\n- [ ] **AC-1**\n\nCloses #42');
  mockedCreatePr.mockResolvedValue('https://github.com/owner/repo/pull/20');
  // Mock ghExec for remote branch check (branch exists on remote)
  mockedGhExec.mockResolvedValue('{"name":"feature/my-branch"}');
}

describe('createPrHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetMockGitOps();
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('errors when gh CLI unavailable', async () => {
    mockedCheckGhAvailable.mockResolvedValue({ available: false, authenticated: false });

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('GitHub CLI');
  });

  it('errors when gh CLI unauthenticated', async () => {
    mockedCheckGhAvailable.mockResolvedValue({ available: true, authenticated: false });

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('errors when no workstream found for current branch', async () => {
    mockedCheckGhAvailable.mockResolvedValue({ available: true, authenticated: true });
    mockedResolveCurrentWorkstream.mockResolvedValue(null);

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('workstream');
  });

  it('errors when no feature linked to workstream', async () => {
    mockedCheckGhAvailable.mockResolvedValue({ available: true, authenticated: true });
    mockedResolveCurrentWorkstream.mockResolvedValue({
      id: 'ws-1',
      path: '/repo/.branchos/workstreams/ws-1',
    });
    mockedReadMeta.mockResolvedValue({
      schemaVersion: 2,
      workstreamId: 'ws-1',
      branch: 'feature/my-branch',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      assignee: null,
      issueNumber: null,
      // No featureId
    });

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No feature linked');
  });

  it('errors when no commits ahead of base branch', async () => {
    setupHappyPath();
    mockGitOpsInstance.getCommitsAhead.mockResolvedValue(0);

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('No commits ahead');
  });

  it('aborts and shows URL when PR already exists for branch', async () => {
    setupHappyPath();
    mockedCheckExistingPr.mockResolvedValue({
      number: 15,
      url: 'https://github.com/owner/repo/pull/15',
    });

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toContain('PR already exists');
    expect(result.url).toBe('https://github.com/owner/repo/pull/15');
  });

  it('calls createPr with correct data on happy path', async () => {
    setupHappyPath();

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(true);
    expect(result.url).toBe('https://github.com/owner/repo/pull/20');
    expect(mockedCreatePr).toHaveBeenCalledWith({
      title: '[F-01] Create PR Command',
      body: expect.any(String),
      baseBranch: 'main',
      assignee: 'octocat',
    });
  });

  it('uses captureAssignee() fallback when meta.assignee is null', async () => {
    setupHappyPath();
    mockedReadMeta.mockResolvedValue({
      schemaVersion: 2,
      workstreamId: 'ws-1',
      branch: 'feature/my-branch',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      assignee: null,
      issueNumber: 42,
      featureId: 'F-01',
    });
    mockedCaptureAssignee.mockResolvedValue('fallback-user');

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(true);
    expect(mockedCaptureAssignee).toHaveBeenCalled();
    expect(mockedCreatePr).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: 'fallback-user' }),
    );
  });

  it('auto-pushes when branch not on remote', async () => {
    setupHappyPath();
    mockedGhExec.mockRejectedValue(new Error('Not Found')); // branch not on remote

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.success).toBe(true);
    expect(mockGitOpsInstance.push).toHaveBeenCalled();
  });

  it('PR title format is [F-XX] Feature Title', async () => {
    setupHappyPath();

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    await createPrHandler({});

    expect(mockedCreatePr).toHaveBeenCalledWith(
      expect.objectContaining({ title: '[F-01] Create PR Command' }),
    );
  });

  it('outputs PR URL on success', async () => {
    setupHappyPath();

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({});

    expect(result.url).toBe('https://github.com/owner/repo/pull/20');
  });

  it('dry-run prints body without creating PR', async () => {
    setupHappyPath();

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    const result = await createPrHandler({ dryRun: true });

    expect(result.success).toBe(true);
    expect(mockedCreatePr).not.toHaveBeenCalled();
  });

  it('feature description is body text before ## Acceptance Criteria heading', async () => {
    setupHappyPath();

    const { createPrHandler } = await import('../../src/cli/create-pr.js');
    await createPrHandler({});

    expect(mockedAssemblePrBody).toHaveBeenCalledWith(
      expect.objectContaining({
        featureDescription: 'Feature description here.',
      }),
    );
  });
});
