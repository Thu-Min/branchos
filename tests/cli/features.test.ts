import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock GitOps before importing the handler
let mockRepoRoot: string;

vi.mock('../../src/git/index.js', () => {
  return {
    GitOps: vi.fn().mockImplementation(() => ({
      isGitRepo: vi.fn().mockResolvedValue(true),
      getRepoRoot: vi.fn().mockImplementation(() => {
        return Promise.resolve(mockRepoRoot);
      }),
    })),
  };
});

// Helper to write a feature file with frontmatter
function featureContent(fields: {
  id: string;
  title: string;
  status: string;
  milestone: string;
  branch: string;
  issue?: number | null;
  body?: string;
}): string {
  const lines = [
    '---',
    `id: ${fields.id}`,
    `title: ${fields.title}`,
    `status: ${fields.status}`,
    `milestone: ${fields.milestone}`,
    `branch: ${fields.branch}`,
    `issue: ${fields.issue ?? 'null'}`,
    '---',
    '',
    fields.body ?? `## Acceptance Criteria\n\n- Feature ${fields.id} works correctly`,
    '',
  ];
  return lines.join('\n');
}

describe('features handler', () => {
  let tempDir: string;
  let featuresDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-features-'));
    mockRepoRoot = tempDir;
    featuresDir = join(tempDir, '.branchos', 'shared', 'features');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function setupFeatures(...features: Parameters<typeof featureContent>[0][]): Promise<void> {
    await mkdir(featuresDir, { recursive: true });
    for (const f of features) {
      const slug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const filename = `${f.id}-${slug}.md`;
      await writeFile(join(featuresDir, filename), featureContent(f));
    }
  }

  it('shows message when no features directory exists', async () => {
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.features).toEqual([]);
    expect(result.message).toContain('No features found');
    expect(result.message).toContain('plan-roadmap');
  });

  it('shows message when features directory is empty', async () => {
    await mkdir(featuresDir, { recursive: true });
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.features).toEqual([]);
    expect(result.message).toContain('No features found');
  });

  it('lists all features', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth System', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
      { id: 'F-002', title: 'Dashboard', status: 'in-progress', milestone: 'M2', branch: 'feature/dashboard' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.features).toHaveLength(2);
    expect(result.features![0].id).toBe('F-001');
    expect(result.features![1].id).toBe('F-002');
  });

  it('filters by --status', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
      { id: 'F-002', title: 'Dashboard', status: 'in-progress', milestone: 'M1', branch: 'feature/dashboard' },
      { id: 'F-003', title: 'Settings', status: 'unassigned', milestone: 'M2', branch: 'feature/settings' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, status: 'unassigned', cwd: tempDir });
    expect(result.features).toHaveLength(2);
    expect(result.features!.every(f => f.status === 'unassigned')).toBe(true);
  });

  it('filters by --milestone', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
      { id: 'F-002', title: 'Dashboard', status: 'in-progress', milestone: 'M2', branch: 'feature/dashboard' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, milestone: 'M1', cwd: tempDir });
    expect(result.features).toHaveLength(1);
    expect(result.features![0].id).toBe('F-001');
  });

  it('combines --status and --milestone filters with AND logic', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
      { id: 'F-002', title: 'Dashboard', status: 'in-progress', milestone: 'M1', branch: 'feature/dashboard' },
      { id: 'F-003', title: 'Settings', status: 'unassigned', milestone: 'M2', branch: 'feature/settings' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, status: 'unassigned', milestone: 'M1', cwd: tempDir });
    expect(result.features).toHaveLength(1);
    expect(result.features![0].id).toBe('F-001');
  });

  it('outputs JSON with --json flag', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: true, cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.features).toHaveLength(1);
  });

  it('shows detail view for a single feature by ID', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth System', status: 'unassigned', milestone: 'M1', branch: 'feature/auth', body: '## Acceptance Criteria\n\n- Users can log in\n- Users can log out' },
      { id: 'F-002', title: 'Dashboard', status: 'in-progress', milestone: 'M2', branch: 'feature/dashboard' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, featureId: 'F-001', cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.feature).toBeDefined();
    expect(result.feature!.id).toBe('F-001');
    expect(result.feature!.title).toBe('Auth System');
    expect(result.feature!.body).toContain('Users can log in');
  });

  it('shows error for non-existent feature ID', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, featureId: 'F-999', cwd: tempDir });
    expect(result.success).toBe(false);
    expect(result.error).toContain('F-999');
    expect(result.error).toContain('not found');
  });

  it('shows message when filters exclude all features', async () => {
    await setupFeatures(
      { id: 'F-001', title: 'Auth', status: 'unassigned', milestone: 'M1', branch: 'feature/auth' },
    );
    const { featuresHandler } = await import('../../src/cli/features.js');
    const result = await featuresHandler({ json: false, status: 'complete', cwd: tempDir });
    expect(result.success).toBe(true);
    expect(result.features).toHaveLength(0);
    expect(result.message).toContain('No features match');
  });
});
