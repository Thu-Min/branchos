import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { hashContent, readMeta, writeMeta, diffSections } from '../../src/prfaq/hash.js';
import type { PrfaqMeta } from '../../src/prfaq/types.js';

describe('hashContent', () => {
  it('normalizes CRLF to LF producing identical hashes', () => {
    const crlfHash = hashContent('hello\r\nworld');
    const lfHash = hashContent('hello\nworld');
    expect(crlfHash).toBe(lfHash);
  });

  it('produces a 64-character hex string (SHA-256)', () => {
    const hash = hashContent('test content');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    const hash1 = hashContent('deterministic input');
    const hash2 = hashContent('deterministic input');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = hashContent('input A');
    const hash2 = hashContent('input B');
    expect(hash1).not.toBe(hash2);
  });
});

describe('readMeta / writeMeta', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-hash-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null when meta file does not exist', async () => {
    const result = await readMeta(tempDir);
    expect(result).toBeNull();
  });

  it('round-trips meta data correctly', async () => {
    const meta: PrfaqMeta = {
      contentHash: 'abc123',
      ingestedAt: '2026-03-09T12:00:00Z',
      version: 1,
      sectionsFound: ['problem', 'solution'],
      sectionsMissing: ['headline'],
      sourceSize: 1024,
    };

    await writeMeta(tempDir, meta);
    const result = await readMeta(tempDir);
    expect(result).toEqual(meta);
  });

  it('creates valid JSON file with trailing newline', async () => {
    const meta: PrfaqMeta = {
      contentHash: 'def456',
      ingestedAt: '2026-03-09T12:00:00Z',
      version: 1,
      sectionsFound: [],
      sectionsMissing: [],
      sourceSize: 0,
    };

    await writeMeta(tempDir, meta);
    const raw = await readFile(join(tempDir, 'prfaq-meta.json'), 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('diffSections', () => {
  it('reports added sections (in new but not old)', () => {
    const oldContent = '## Problem\nOld problem text';
    const newContent = '## Problem\nOld problem text\n## Solution\nNew solution text';

    const diff = diffSections(oldContent, newContent);
    expect(diff.added).toContain('solution');
    expect(diff.removed).toHaveLength(0);
  });

  it('reports removed sections (in old but not new)', () => {
    const oldContent = '## Problem\nProblem text\n## Solution\nSolution text';
    const newContent = '## Problem\nProblem text';

    const diff = diffSections(oldContent, newContent);
    expect(diff.removed).toContain('solution');
    expect(diff.added).toHaveLength(0);
  });

  it('reports modified sections (same heading, different content)', () => {
    const oldContent = '## Problem\nOriginal problem text';
    const newContent = '## Problem\nUpdated problem text';

    const diff = diffSections(oldContent, newContent);
    expect(diff.modified).toContain('problem');
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('returns empty arrays for identical content', () => {
    const content = '## Problem\nSame text\n## Solution\nSame solution';

    const diff = diffSections(content, content);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });
});
