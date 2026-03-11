import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  researchFilename,
  nextResearchId,
  writeResearchFile,
  readResearchFile,
  readAllResearch,
} from '../../src/research/research-file.js';
import type { ResearchArtifact } from '../../src/research/types.js';

describe('research-file', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-research-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const makeArtifact = (overrides?: Partial<ResearchArtifact>): ResearchArtifact => ({
    id: 'R-001',
    topic: 'Auth Patterns',
    status: 'draft',
    date: '2026-03-11',
    features: ['F-001', 'F-003'],
    body: '## Summary\n\nJWT vs session auth comparison.',
    filename: 'R-001-auth-patterns.md',
    ...overrides,
  });

  describe('researchFilename', () => {
    it('generates filename from id and topic', () => {
      expect(researchFilename('R-001', 'Auth Patterns')).toBe('R-001-auth-patterns.md');
    });
  });

  describe('nextResearchId', () => {
    it('returns R-001 for empty array', () => {
      expect(nextResearchId([])).toBe('R-001');
    });

    it('uses max id, not count (gaps)', () => {
      expect(nextResearchId(['R-001', 'R-003'])).toBe('R-004');
    });

    it('pads to 3 digits', () => {
      expect(nextResearchId(['R-009'])).toBe('R-010');
    });
  });

  describe('writeResearchFile', () => {
    it('creates file at dir/R-NNN-slug.md with frontmatter and body', async () => {
      const artifact = makeArtifact();
      const path = await writeResearchFile(tempDir, artifact);
      expect(path).toBe(join(tempDir, 'R-001-auth-patterns.md'));

      const content = await readFile(path, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('id: R-001');
      expect(content).toContain('topic: Auth Patterns');
      expect(content).toContain('status: draft');
      expect(content).toContain('features: [F-001, F-003]');
      expect(content).toContain('JWT vs session auth');
    });

    it('creates directory recursively if needed', async () => {
      const nestedDir = join(tempDir, 'nested', 'research');
      const artifact = makeArtifact();
      const path = await writeResearchFile(nestedDir, artifact);
      const content = await readFile(path, 'utf-8');
      expect(content).toContain('id: R-001');
    });
  });

  describe('readResearchFile', () => {
    it('parses frontmatter including features array and body', async () => {
      const artifact = makeArtifact();
      const path = await writeResearchFile(tempDir, artifact);
      const read = await readResearchFile(path);

      expect(read.id).toBe('R-001');
      expect(read.topic).toBe('Auth Patterns');
      expect(read.status).toBe('draft');
      expect(read.date).toBe('2026-03-11');
      expect(read.features).toEqual(['F-001', 'F-003']);
      expect(read.body).toContain('JWT vs session auth');
    });

    it('sets filename from basename', async () => {
      const artifact = makeArtifact();
      const path = await writeResearchFile(tempDir, artifact);
      const read = await readResearchFile(path);
      expect(read.filename).toBe('R-001-auth-patterns.md');
    });
  });

  describe('readAllResearch', () => {
    it('returns R-*.md files sorted by id', async () => {
      await writeResearchFile(tempDir, makeArtifact({ id: 'R-003', topic: 'Third', filename: 'R-003-third.md' }));
      await writeResearchFile(tempDir, makeArtifact({ id: 'R-001', topic: 'First', filename: 'R-001-first.md' }));
      await writeResearchFile(tempDir, makeArtifact({ id: 'R-002', topic: 'Second', filename: 'R-002-second.md' }));

      const all = await readAllResearch(tempDir);
      expect(all.map((a) => a.id)).toEqual(['R-001', 'R-002', 'R-003']);
    });

    it('skips non-research files', async () => {
      await writeResearchFile(tempDir, makeArtifact());
      await writeFile(join(tempDir, 'index.json'), '[]');
      await writeFile(join(tempDir, 'README.md'), '# Not research');

      const all = await readAllResearch(tempDir);
      expect(all).toHaveLength(1);
    });

    it('returns empty array for missing directory', async () => {
      const missing = join(tempDir, 'does-not-exist');
      const all = await readAllResearch(missing);
      expect(all).toEqual([]);
    });

    it('returns empty array for empty directory', async () => {
      const emptyDir = join(tempDir, 'empty');
      await mkdir(emptyDir);
      const all = await readAllResearch(emptyDir);
      expect(all).toEqual([]);
    });
  });

  describe('round-trip', () => {
    it('write then read round-trips all fields including features array', async () => {
      const original = makeArtifact({
        features: ['F-001', 'F-005', 'F-010'],
      });
      const path = await writeResearchFile(tempDir, original);
      const read = await readResearchFile(path);

      expect(read.id).toBe(original.id);
      expect(read.topic).toBe(original.topic);
      expect(read.status).toBe(original.status);
      expect(read.date).toBe(original.date);
      expect(read.features).toEqual(original.features);
      expect(read.body).toContain('JWT vs session auth');
      expect(read.filename).toBe(original.filename);
    });
  });
});
