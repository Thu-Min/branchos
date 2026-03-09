import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

// Mock GitOps before importing the handler
vi.mock('../../src/git/index.js', () => {
  const addAndCommitSpy = vi.fn();
  return {
    GitOps: vi.fn().mockImplementation(() => ({
      isGitRepo: vi.fn().mockResolvedValue(true),
      getRepoRoot: vi.fn().mockImplementation(function (this: { _cwd: string }) {
        // Return the cwd that was passed to the constructor
        return Promise.resolve(mockRepoRoot);
      }),
      addAndCommit: addAndCommitSpy,
    })),
    __addAndCommitSpy: addAndCommitSpy,
  };
});

// Mock promptYesNo
vi.mock('../../src/workstream/prompt.js', () => ({
  promptYesNo: vi.fn().mockResolvedValue(true),
}));

let mockRepoRoot: string;

const SAMPLE_PRFAQ = `# Headline

Our amazing product launch.

## Problem

Customers struggle with X.

## Solution

We built Y to solve X.

## Leadership Quote

"This is transformative." - CEO

## Call to Action

Try it today at example.com.

## Customer FAQ

### Q: How does it work?
A: Magic.

## Internal FAQ

### Q: What's the cost?
A: Reasonable.

## Subheadline

A brief subtitle for the release.
`;

const MINIMAL_DOC = `# Just a random doc

Some content here with no PR-FAQ sections at all.
`;

describe('ingest-prfaq', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-ingest-prfaq-'));
    mockRepoRoot = tempDir;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function setupBranchosDir(): Promise<void> {
    await mkdir(join(tempDir, '.branchos', 'shared'), { recursive: true });
  }

  async function writePrfaq(content: string = SAMPLE_PRFAQ): Promise<void> {
    await writeFile(join(tempDir, 'PR-FAQ.md'), content);
  }

  describe('ingestPrfaqHandler', () => {
    it('returns error when PR-FAQ.md is missing', async () => {
      await setupBranchosDir();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No PR-FAQ.md found');
    });

    it('returns error when .branchos/ directory is missing', async () => {
      await writePrfaq();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(false);
      expect(result.error).toContain('BranchOS not initialized');
    });

    it('ingests valid PR-FAQ on first run', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.action).toBe('ingested');
      expect(result.sectionsFound.length).toBeGreaterThan(0);

      // Verify file was copied
      const stored = await readFile(join(tempDir, '.branchos', 'shared', 'PR-FAQ.md'), 'utf-8');
      expect(stored).toBe(SAMPLE_PRFAQ);

      // Verify metadata was written
      const metaPath = join(tempDir, '.branchos', 'shared', 'prfaq-meta.json');
      expect(existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
      expect(meta.contentHash).toBeDefined();
      expect(meta.sectionsFound).toEqual(result.sectionsFound);
    });

    it('auto-commits after first ingestion', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { GitOps } = await import('../../src/git/index.js');
      const { __addAndCommitSpy } = await import('../../src/git/index.js') as any;
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');

      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(__addAndCommitSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['.branchos/shared/PR-FAQ.md', '.branchos/shared/prfaq-meta.json']),
        'chore: ingest PR-FAQ',
      );
    });

    it('returns unchanged when re-ingesting same content', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');

      // First ingestion
      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      // Second ingestion (same content)
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(true);
      expect(result.action).toBe('unchanged');
    });

    it('does not commit when content is unchanged', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { __addAndCommitSpy } = await import('../../src/git/index.js') as any;
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');

      // First ingestion
      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      __addAndCommitSpy.mockClear();

      // Second ingestion
      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      expect(__addAndCommitSpy).not.toHaveBeenCalled();
    });

    it('returns updated with diff when content changes', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');

      // First ingestion
      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      // Modify PR-FAQ
      const modifiedContent = SAMPLE_PRFAQ.replace(
        'Customers struggle with X.',
        'Customers really struggle with X and Y.',
      );
      await writeFile(join(tempDir, 'PR-FAQ.md'), modifiedContent);

      // Re-ingest
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.diff).toBeDefined();
      expect(result.diff!.modified).toContain('problem');
    });

    it('auto-commits with update message on re-ingestion', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { __addAndCommitSpy } = await import('../../src/git/index.js') as any;
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');

      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });
      __addAndCommitSpy.mockClear();

      // Modify and re-ingest
      await writeFile(join(tempDir, 'PR-FAQ.md'), SAMPLE_PRFAQ + '\n## Extra Section\n\nMore content.\n');
      await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(__addAndCommitSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['.branchos/shared/PR-FAQ.md', '.branchos/shared/prfaq-meta.json']),
        'chore: update PR-FAQ',
      );
    });

    it('prompts for confirmation on non-PR-FAQ document', async () => {
      await setupBranchosDir();
      await writePrfaq(MINIMAL_DOC);
      const { promptYesNo } = await import('../../src/workstream/prompt.js');
      const mockPrompt = vi.mocked(promptYesNo);
      mockPrompt.mockResolvedValue(false);

      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(mockPrompt).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Aborted');
    });

    it('skips confirmation with --force on non-PR-FAQ document', async () => {
      await setupBranchosDir();
      await writePrfaq(MINIMAL_DOC);
      const { promptYesNo } = await import('../../src/workstream/prompt.js');
      const mockPrompt = vi.mocked(promptYesNo);

      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: true, cwd: tempDir });

      expect(mockPrompt).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.action).toBe('ingested');
    });

    it('includes sectionsFound and sectionsMissing in result', async () => {
      await setupBranchosDir();
      await writePrfaq();
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(result.sectionsFound).toBeInstanceOf(Array);
      expect(result.sectionsMissing).toBeInstanceOf(Array);
      // SAMPLE_PRFAQ has all 8 sections
      expect(result.sectionsFound.length).toBe(8);
      expect(result.sectionsMissing.length).toBe(0);
    });

    it('reports missing sections as warnings', async () => {
      // Create PR-FAQ with only some sections (3 sections to pass isLikelyPrfaq)
      const partialPrfaq = `# Headline

Our product.

## Problem

A problem exists.

## Solution

We fix it.
`;
      await setupBranchosDir();
      await writePrfaq(partialPrfaq);
      const { ingestPrfaqHandler } = await import('../../src/cli/ingest-prfaq.js');
      const result = await ingestPrfaqHandler({ json: true, force: false, cwd: tempDir });

      expect(result.success).toBe(true);
      expect(result.sectionsMissing.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
