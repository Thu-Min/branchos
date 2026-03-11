import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  rebuildIndex,
  readIndex,
  findResearchByFeature,
} from '../../src/research/research-index.js';
import { writeResearchFile } from '../../src/research/research-file.js';
import type { ResearchArtifact } from '../../src/research/types.js';

describe('research-index', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-research-idx-'));
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
    body: '## Summary\n\nJWT vs session auth.',
    filename: 'R-001-auth-patterns.md',
    ...overrides,
  });

  /** Helper: write artifact without triggering rebuildIndex (writes file directly) */
  async function writeArtifactDirect(dir: string, artifact: ResearchArtifact): Promise<void> {
    // Use writeResearchFile which currently does NOT call rebuildIndex
    await writeResearchFile(dir, artifact);
  }

  describe('rebuildIndex', () => {
    it('creates index.json with entries matching frontmatter for 3 files', async () => {
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-001', topic: 'First', filename: 'R-001-first.md' }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-002', topic: 'Second', filename: 'R-002-second.md', features: ['F-002'] }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-003', topic: 'Third', filename: 'R-003-third.md', features: [] }));

      const entries = await rebuildIndex(tempDir);
      expect(entries).toHaveLength(3);
      expect(entries[0].id).toBe('R-001');
      expect(entries[1].id).toBe('R-002');
      expect(entries[2].id).toBe('R-003');

      // Verify file written
      const raw = await readFile(join(tempDir, 'index.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveLength(3);
    });

    it('creates index.json with empty array for empty directory', async () => {
      await mkdir(tempDir, { recursive: true });
      const entries = await rebuildIndex(tempDir);
      expect(entries).toEqual([]);

      const raw = await readFile(join(tempDir, 'index.json'), 'utf-8');
      expect(JSON.parse(raw)).toEqual([]);
    });

    it('overwrites stale index.json with current state', async () => {
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-001', topic: 'First', filename: 'R-001-first.md' }));
      await rebuildIndex(tempDir);

      // Write another file
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-002', topic: 'Second', filename: 'R-002-second.md' }));
      const entries = await rebuildIndex(tempDir);
      expect(entries).toHaveLength(2);
    });

    it('each entry has id, topic, status, date, features, filename fields', async () => {
      await writeArtifactDirect(tempDir, makeArtifact());
      const entries = await rebuildIndex(tempDir);
      const entry = entries[0];

      expect(entry).toHaveProperty('id', 'R-001');
      expect(entry).toHaveProperty('topic', 'Auth Patterns');
      expect(entry).toHaveProperty('status', 'draft');
      expect(entry).toHaveProperty('date', '2026-03-11');
      expect(entry).toHaveProperty('features', ['F-001', 'F-003']);
      expect(entry).toHaveProperty('filename', 'R-001-auth-patterns.md');
    });
  });

  describe('readIndex', () => {
    it('returns parsed array from index.json', async () => {
      await writeArtifactDirect(tempDir, makeArtifact());
      await rebuildIndex(tempDir);

      const entries = await readIndex(tempDir);
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('R-001');
    });

    it('returns empty array when index.json missing', async () => {
      const entries = await readIndex(tempDir);
      expect(entries).toEqual([]);
    });

    it('returns empty array when directory missing', async () => {
      const missing = join(tempDir, 'does-not-exist');
      const entries = await readIndex(missing);
      expect(entries).toEqual([]);
    });
  });

  describe('findResearchByFeature', () => {
    it('returns only entries where features includes the given feature ID', async () => {
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-001', topic: 'A', filename: 'R-001-a.md', features: ['F-001', 'F-003'] }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-002', topic: 'B', filename: 'R-002-b.md', features: ['F-002'] }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-003', topic: 'C', filename: 'R-003-c.md', features: ['F-001'] }));
      await rebuildIndex(tempDir);

      const results = await findResearchByFeature(tempDir, 'F-001');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toEqual(['R-001', 'R-003']);
    });

    it('returns empty array with no matches', async () => {
      await writeArtifactDirect(tempDir, makeArtifact({ features: ['F-001'] }));
      await rebuildIndex(tempDir);

      const results = await findResearchByFeature(tempDir, 'F-999');
      expect(results).toEqual([]);
    });

    it('returns all matching entries when feature linked in multiple research', async () => {
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-001', topic: 'A', filename: 'R-001-a.md', features: ['F-005'] }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-002', topic: 'B', filename: 'R-002-b.md', features: ['F-005', 'F-006'] }));
      await writeArtifactDirect(tempDir, makeArtifact({ id: 'R-003', topic: 'C', filename: 'R-003-c.md', features: ['F-005'] }));
      await rebuildIndex(tempDir);

      const results = await findResearchByFeature(tempDir, 'F-005');
      expect(results).toHaveLength(3);
    });
  });

  describe('writeResearchFile triggers rebuildIndex', () => {
    it('index.json is updated after writeResearchFile', async () => {
      // After wiring, writeResearchFile should call rebuildIndex
      await writeResearchFile(tempDir, makeArtifact());

      const raw = await readFile(join(tempDir, 'index.json'), 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('R-001');
    });
  });
});
