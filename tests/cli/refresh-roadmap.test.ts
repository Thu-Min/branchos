import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock GitOps before importing the handler
const addAndCommitSpy = vi.fn();
vi.mock('../../src/git/index.js', () => {
  return {
    GitOps: vi.fn().mockImplementation(() => ({
      isGitRepo: vi.fn().mockResolvedValue(true),
      getRepoRoot: vi.fn().mockImplementation(() => {
        return Promise.resolve(mockRepoRoot);
      }),
      addAndCommit: addAndCommitSpy,
    })),
  };
});

// Mock promptYesNo
const promptYesNoSpy = vi.fn().mockResolvedValue(true);
vi.mock('../../src/workstream/prompt.js', () => ({
  promptYesNo: (...args: any[]) => promptYesNoSpy(...args),
}));

let mockRepoRoot: string;

import type { RoadmapData, Feature } from '../../src/roadmap/types.js';

function makeFeature(overrides: Partial<Feature> & { id: string; title: string }): Feature {
  return {
    status: 'unassigned',
    milestone: 'M1',
    branch: `feature/${overrides.title.toLowerCase().replace(/\s+/g, '-')}`,
    issue: null,
    workstream: null,
    body: `## Acceptance Criteria\n\n- [ ] ${overrides.title} works`,
    filename: `${overrides.id}-${overrides.title.toLowerCase().replace(/\s+/g, '-')}.md`,
    ...overrides,
  };
}

const EXISTING_FEATURES: Feature[] = [
  makeFeature({ id: 'F-001', title: 'User auth', status: 'in-progress', issue: 10, workstream: 'ws-auth' }),
  makeFeature({ id: 'F-002', title: 'API gateway', status: 'assigned', issue: 11, workstream: 'ws-api' }),
  makeFeature({ id: 'F-003', title: 'Dashboard', status: 'unassigned', issue: null, workstream: null }),
];

const NEW_ROADMAP_DATA: RoadmapData = {
  projectName: 'TestProject',
  vision: 'Build something great',
  milestones: [
    {
      id: 'M1',
      name: 'Foundation',
      features: [
        makeFeature({ id: 'F-001', title: 'User authentication', body: '## Acceptance Criteria\n\n- [ ] OAuth works' }),
        makeFeature({ id: 'F-002', title: 'API gateway', body: '## Acceptance Criteria\n\n- [ ] Gateway routes v2' }),
        makeFeature({ id: 'F-004', title: 'Notifications', body: '## Acceptance Criteria\n\n- [ ] Notifies users' }),
      ],
    },
  ],
};

describe('refresh-roadmap', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-refresh-roadmap-'));
    mockRepoRoot = tempDir;
    vi.clearAllMocks();
    promptYesNoSpy.mockResolvedValue(true);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function setupBranchosDir(): Promise<void> {
    await mkdir(join(tempDir, '.branchos', 'shared', 'features'), { recursive: true });
  }

  async function setupPrfaqMeta(): Promise<void> {
    await writeFile(
      join(tempDir, '.branchos', 'shared', 'prfaq-meta.json'),
      JSON.stringify({ contentHash: 'abc123', ingestedAt: '2026-03-10', version: 1, sectionsFound: [], sectionsMissing: [], sourceSize: 100 }),
    );
  }

  async function setupExistingFeatures(features: Feature[] = EXISTING_FEATURES): Promise<void> {
    const { writeFeatureFile } = await import('../../src/roadmap/feature-file.js');
    const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
    for (const f of features) {
      await writeFeatureFile(featuresDir, f);
    }
  }

  async function setupPrfaq(): Promise<void> {
    await writeFile(join(tempDir, 'PR-FAQ.md'), '# PR-FAQ\n\nSome content here.');
  }

  describe('refreshRoadmapHandler', () => {
    it('returns error when not a git repo', async () => {
      const { GitOps } = await import('../../src/git/index.js');
      vi.mocked(GitOps).mockImplementationOnce(() => ({
        isGitRepo: vi.fn().mockResolvedValue(false),
        getRepoRoot: vi.fn(),
        addAndCommit: vi.fn(),
      }) as any);

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });

    it('returns error when .branchos/ is missing', async () => {
      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('BranchOS not initialized');
    });

    it('returns error when no PR-FAQ ingested', async () => {
      await setupBranchosDir();
      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No PR-FAQ');
    });

    it('returns error when no roadmapData provided', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('roadmap data');
    });

    it('matched features preserve id, status, issue, workstream', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(result.success).toBe(true);
      // "User auth" matches "User authentication" by title similarity
      expect(result.updated).toBeGreaterThanOrEqual(1);

      // Read the updated F-001 feature file to verify metadata preserved
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      const files = await readdir(featuresDir);
      const f001File = files.find((f) => f.startsWith('F-001'));
      expect(f001File).toBeDefined();
      const content = await readFile(join(featuresDir, f001File!), 'utf-8');
      expect(content).toContain('status: in-progress');
      expect(content).toContain('issue: 10');
      expect(content).toContain('workstream: ws-auth');
    });

    it('matched features get updated body', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      // F-002 "API gateway" exact match -- body should be updated
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      const files = await readdir(featuresDir);
      const f002File = files.find((f) => f.startsWith('F-002'));
      expect(f002File).toBeDefined();
      const content = await readFile(join(featuresDir, f002File!), 'utf-8');
      expect(content).toContain('Gateway routes v2');
    });

    it('unmatched old features get dropped status', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(result.dropped).toBeGreaterThanOrEqual(1);

      // F-003 "Dashboard" is not in new roadmap data -- should be dropped
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      const files = await readdir(featuresDir);
      const f003File = files.find((f) => f.startsWith('F-003'));
      expect(f003File).toBeDefined();
      const content = await readFile(join(featuresDir, f003File!), 'utf-8');
      expect(content).toContain('status: dropped');
    });

    it('new features get sequential IDs starting after highest existing', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(result.added).toBeGreaterThanOrEqual(1);

      // "Notifications" is new -- should get F-004
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      const files = await readdir(featuresDir);
      const f004File = files.find((f) => f.startsWith('F-004'));
      expect(f004File).toBeDefined();
      const content = await readFile(join(featuresDir, f004File!), 'utf-8');
      expect(content).toContain('id: F-004');
      expect(content).toContain('status: unassigned');
      expect(content).toContain('Notifies users');
    });

    it('confirmation declined returns success=false without writing', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();
      promptYesNoSpy.mockResolvedValue(false);

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({
        json: true,
        force: false,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(result.success).toBe(false);
      expect(addAndCommitSpy).not.toHaveBeenCalled();
    });

    it('--force skips confirmation prompt', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      const result = await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(result.success).toBe(true);
      expect(promptYesNoSpy).not.toHaveBeenCalled();
    });

    it('auto-commits after writing', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await setupExistingFeatures();
      await setupPrfaq();

      const { refreshRoadmapHandler } = await import('../../src/cli/refresh-roadmap.js');
      await refreshRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: NEW_ROADMAP_DATA,
      });

      expect(addAndCommitSpy).toHaveBeenCalledTimes(1);
      const [files, message] = addAndCommitSpy.mock.calls[0];
      expect(message).toContain('refresh');
      expect(files.some((f: string) => f.includes('ROADMAP.md'))).toBe(true);
    });
  });
});
