import { describe, it, expect } from 'vitest';
import { parseMapMetadata, MAP_FILES, MapMetadata } from '../../src/map/index.js';

describe('parseMapMetadata', () => {
  it('parses valid frontmatter with all 3 fields', () => {
    const content = [
      '---',
      'generated: 2026-03-08T04:00:00Z',
      'commit: abc1234',
      'generator: branchos/map-codebase',
      '---',
      '# Architecture',
      'Content here',
    ].join('\n');

    const result = parseMapMetadata(content);
    expect(result).not.toBeNull();
    expect(result!.generated).toBe('2026-03-08T04:00:00Z');
    expect(result!.commit).toBe('abc1234');
    expect(result!.generator).toBe('branchos/map-codebase');
  });

  it('returns null for content without frontmatter', () => {
    const content = '# Architecture\nNo frontmatter here';
    const result = parseMapMetadata(content);
    expect(result).toBeNull();
  });

  it('returns null for frontmatter missing required fields', () => {
    const content = [
      '---',
      'generated: 2026-03-08T04:00:00Z',
      'commit: abc1234',
      '---',
      '# Content',
    ].join('\n');

    const result = parseMapMetadata(content);
    expect(result).toBeNull();
  });

  it('handles values containing colons (rejoin)', () => {
    const content = [
      '---',
      'generated: 2026-03-08T04:00:00Z',
      'commit: abc:def:123',
      'generator: branchos/map-codebase',
      '---',
      '# Content',
    ].join('\n');

    const result = parseMapMetadata(content);
    expect(result).not.toBeNull();
    expect(result!.commit).toBe('abc:def:123');
  });

  it('returns null for empty string', () => {
    expect(parseMapMetadata('')).toBeNull();
  });

  it('returns null for single delimiter only', () => {
    const content = '---\ngenerated: foo\n';
    expect(parseMapMetadata(content)).toBeNull();
  });
});

describe('MAP_FILES', () => {
  it('contains exactly 5 file names', () => {
    expect(MAP_FILES).toHaveLength(5);
  });

  it('contains all expected map file names', () => {
    expect(MAP_FILES).toContain('ARCHITECTURE.md');
    expect(MAP_FILES).toContain('MODULES.md');
    expect(MAP_FILES).toContain('CONVENTIONS.md');
    expect(MAP_FILES).toContain('STACK.md');
    expect(MAP_FILES).toContain('CONCERNS.md');
  });
});
