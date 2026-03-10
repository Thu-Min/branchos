import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  writeFeatureFile,
  readFeatureFile,
  readAllFeatures,
} from '../../src/roadmap/feature-file.js';
import type { Feature } from '../../src/roadmap/types.js';

describe('feature-file', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-feature-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const makeFeature = (overrides?: Partial<Feature>): Feature => ({
    id: 'F-001',
    title: 'User Auth',
    status: 'unassigned',
    milestone: 'M1',
    branch: 'feature/user-auth',
    issue: null,
    body: '## Acceptance Criteria\n\n- [ ] User can log in',
    filename: 'F-001-user-auth.md',
    ...overrides,
  });

  describe('writeFeatureFile', () => {
    it('creates a file at dir/filename with frontmatter and body', async () => {
      const feature = makeFeature();
      const path = await writeFeatureFile(tempDir, feature);
      expect(path).toBe(join(tempDir, 'F-001-user-auth.md'));

      const read = await readFeatureFile(path);
      expect(read.id).toBe('F-001');
      expect(read.title).toBe('User Auth');
      expect(read.body).toContain('User can log in');
    });

    it('creates directory if it does not exist', async () => {
      const nestedDir = join(tempDir, 'nested', 'features');
      const feature = makeFeature();
      await writeFeatureFile(nestedDir, feature);
      const read = await readFeatureFile(join(nestedDir, 'F-001-user-auth.md'));
      expect(read.id).toBe('F-001');
    });
  });

  describe('readFeatureFile', () => {
    it('parses frontmatter and body from a feature file', async () => {
      const feature = makeFeature({ issue: 42 });
      const path = await writeFeatureFile(tempDir, feature);
      const read = await readFeatureFile(path);

      expect(read.id).toBe('F-001');
      expect(read.status).toBe('unassigned');
      expect(read.issue).toBe(42);
      expect(read.filename).toBe('F-001-user-auth.md');
      expect(read.body).toContain('Acceptance Criteria');
    });
  });

  describe('readAllFeatures', () => {
    it('returns features sorted by id', async () => {
      await writeFeatureFile(
        tempDir,
        makeFeature({ id: 'F-003', title: 'Third', filename: 'F-003-third.md' }),
      );
      await writeFeatureFile(
        tempDir,
        makeFeature({ id: 'F-001', title: 'First', filename: 'F-001-first.md' }),
      );
      await writeFeatureFile(
        tempDir,
        makeFeature({ id: 'F-002', title: 'Second', filename: 'F-002-second.md' }),
      );

      const features = await readAllFeatures(tempDir);
      expect(features.map((f) => f.id)).toEqual(['F-001', 'F-002', 'F-003']);
    });

    it('skips non-feature files', async () => {
      await writeFeatureFile(tempDir, makeFeature());
      await writeFile(join(tempDir, 'README.md'), '# Not a feature');

      const features = await readAllFeatures(tempDir);
      expect(features).toHaveLength(1);
    });

    it('returns empty array for missing directory', async () => {
      const missing = join(tempDir, 'does-not-exist');
      const features = await readAllFeatures(missing);
      expect(features).toEqual([]);
    });

    it('returns empty array for empty directory', async () => {
      const emptyDir = join(tempDir, 'empty');
      await mkdir(emptyDir);
      const features = await readAllFeatures(emptyDir);
      expect(features).toEqual([]);
    });
  });
});
