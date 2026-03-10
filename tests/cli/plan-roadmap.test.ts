import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

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

let mockRepoRoot: string;

const SAMPLE_ROADMAP_DATA = {
  projectName: 'TestProject',
  vision: 'Build something great',
  milestones: [
    {
      id: 'M1',
      name: 'Foundation',
      features: [
        {
          id: 'F-001',
          title: 'User auth',
          status: 'unassigned' as const,
          milestone: 'M1',
          branch: 'feature/user-auth',
          issue: null,
          body: '## Acceptance Criteria\n\n- [ ] Users can log in',
          filename: 'F-001-user-auth.md',
        },
        {
          id: 'F-002',
          title: 'API gateway',
          status: 'unassigned' as const,
          milestone: 'M1',
          branch: 'feature/api-gateway',
          issue: null,
          body: '## Acceptance Criteria\n\n- [ ] API routes work',
          filename: 'F-002-api-gateway.md',
          dependsOn: ['F-001'],
        },
      ],
    },
  ],
};

describe('plan-roadmap', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-plan-roadmap-'));
    mockRepoRoot = tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function setupBranchosDir(): Promise<void> {
    await mkdir(join(tempDir, '.branchos', 'shared'), { recursive: true });
  }

  async function setupPrfaqMeta(): Promise<void> {
    await writeFile(
      join(tempDir, '.branchos', 'shared', 'prfaq-meta.json'),
      JSON.stringify({ contentHash: 'abc123', ingestedAt: '2026-03-10', version: 1 }),
    );
  }

  describe('planRoadmapHandler', () => {
    it('returns error when not a git repo', async () => {
      const { GitOps } = await import('../../src/git/index.js');
      vi.mocked(GitOps).mockImplementationOnce(() => ({
        isGitRepo: vi.fn().mockResolvedValue(false),
        getRepoRoot: vi.fn(),
        addAndCommit: vi.fn(),
      }) as any);

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a git repository');
    });

    it('returns error when .branchos/ is missing', async () => {
      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('BranchOS not initialized');
    });

    it('returns error when no PR-FAQ has been ingested', async () => {
      await setupBranchosDir();
      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No PR-FAQ found');
    });

    it('returns error when ROADMAP.md exists and force=false', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await writeFile(join(tempDir, '.branchos', 'shared', 'ROADMAP.md'), '# Existing');

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({
        json: true,
        force: false,
        cwd: tempDir,
        roadmapData: SAMPLE_ROADMAP_DATA,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('ROADMAP.md already exists');
      expect(result.error).toContain('--force');
    });

    it('overwrites existing ROADMAP.md with --force', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();
      await writeFile(join(tempDir, '.branchos', 'shared', 'ROADMAP.md'), '# Old');
      // Create existing feature files to verify they get cleared
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      await mkdir(featuresDir, { recursive: true });
      await writeFile(join(featuresDir, 'F-099-old.md'), '# Old feature');

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({
        json: true,
        force: true,
        cwd: tempDir,
        roadmapData: SAMPLE_ROADMAP_DATA,
      });
      expect(result.success).toBe(true);

      // Old feature file should be gone
      expect(existsSync(join(featuresDir, 'F-099-old.md'))).toBe(false);
      // New feature files should exist
      expect(existsSync(join(featuresDir, 'F-001-user-auth.md'))).toBe(true);
    });

    it('returns error when no roadmapData provided', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('slash command');
    });

    it('writes ROADMAP.md and feature files on success', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({
        json: true,
        force: false,
        cwd: tempDir,
        roadmapData: SAMPLE_ROADMAP_DATA,
      });

      expect(result.success).toBe(true);
      expect(result.featureCount).toBe(2);
      expect(result.milestoneCount).toBe(1);

      // ROADMAP.md should be written
      const roadmap = await readFile(join(tempDir, '.branchos', 'shared', 'ROADMAP.md'), 'utf-8');
      expect(roadmap).toContain('TestProject');
      expect(roadmap).toContain('Foundation');

      // Feature files should be written
      const featuresDir = join(tempDir, '.branchos', 'shared', 'features');
      const files = await readdir(featuresDir);
      expect(files).toContain('F-001-user-auth.md');
      expect(files).toContain('F-002-api-gateway.md');
    });

    it('auto-commits all written files', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      await planRoadmapHandler({
        json: true,
        force: false,
        cwd: tempDir,
        roadmapData: SAMPLE_ROADMAP_DATA,
      });

      expect(addAndCommitSpy).toHaveBeenCalledTimes(1);
      const [files, message] = addAndCommitSpy.mock.calls[0];
      expect(files).toContain('.branchos/shared/ROADMAP.md');
      expect(files.some((f: string) => f.includes('F-001'))).toBe(true);
      expect(files.some((f: string) => f.includes('F-002'))).toBe(true);
      expect(message).toContain('roadmap');
    });

    it('returns correct counts in result', async () => {
      await setupBranchosDir();
      await setupPrfaqMeta();

      const { planRoadmapHandler } = await import('../../src/cli/plan-roadmap.js');
      const result = await planRoadmapHandler({
        json: true,
        force: false,
        cwd: tempDir,
        roadmapData: SAMPLE_ROADMAP_DATA,
      });

      expect(result.success).toBe(true);
      expect(result.featureCount).toBe(2);
      expect(result.milestoneCount).toBe(1);
      expect(result.error).toBeUndefined();
    });
  });
});
