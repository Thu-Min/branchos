import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from '../../src/roadmap/frontmatter.js';
import { FEATURE_STATUSES } from '../../src/roadmap/types.js';

describe('parseFrontmatter', () => {
  it('parses a complete frontmatter block with null issue', () => {
    const input = [
      '---',
      'id: F-001',
      'title: User Auth',
      'status: unassigned',
      'milestone: M1',
      'branch: feature/user-auth',
      'issue: null',
      '---',
      '',
      '# Body',
    ].join('\n');

    const result = parseFrontmatter(input);
    expect(result.data).toEqual({
      id: 'F-001',
      title: 'User Auth',
      status: 'unassigned',
      milestone: 'M1',
      branch: 'feature/user-auth',
      issue: null,
    });
    expect(result.body).toBe('# Body');
  });

  it('parses issue as number when present', () => {
    const input = [
      '---',
      'id: F-002',
      'title: Dashboard',
      'status: assigned',
      'milestone: M2',
      'branch: feature/dashboard',
      'issue: 42',
      '---',
      '',
      'Some body',
    ].join('\n');

    const result = parseFrontmatter(input);
    expect(result.data.issue).toBe(42);
  });

  it('parses title containing colon correctly', () => {
    const input = [
      '---',
      'id: F-003',
      'title: Auth: OAuth2',
      'status: unassigned',
      'milestone: M1',
      'branch: feature/auth-oauth2',
      'issue: null',
      '---',
      '',
      'Body text',
    ].join('\n');

    const result = parseFrontmatter(input);
    expect(result.data.title).toBe('Auth: OAuth2');
  });

  it('throws on missing frontmatter delimiters', () => {
    const input = 'No frontmatter here\nJust plain text';
    expect(() => parseFrontmatter(input)).toThrow();
  });
});

describe('stringifyFrontmatter', () => {
  it('round-trips with parseFrontmatter', () => {
    const data = {
      id: 'F-001',
      title: 'User Auth',
      status: 'unassigned' as const,
      milestone: 'M1',
      branch: 'feature/user-auth',
      issue: null,
    };

    const stringified = stringifyFrontmatter(data);
    const parsed = parseFrontmatter(stringified + '\n\nBody here');
    expect(parsed.data).toEqual(data);
  });

  it('writes issue: null explicitly', () => {
    const data = {
      id: 'F-001',
      title: 'Test',
      status: 'unassigned' as const,
      milestone: 'M1',
      branch: 'feature/test',
      issue: null,
    };

    const result = stringifyFrontmatter(data);
    expect(result).toContain('issue: null');
  });

  it('round-trips with numeric issue', () => {
    const data = {
      id: 'F-010',
      title: 'Feature Ten',
      status: 'in-progress' as const,
      milestone: 'M2',
      branch: 'feature/feature-ten',
      issue: 99,
    };

    const stringified = stringifyFrontmatter(data);
    const parsed = parseFrontmatter(stringified + '\n\nBody');
    expect(parsed.data).toEqual(data);
  });
});

describe('FEATURE_STATUSES', () => {
  it('contains exactly the four lifecycle statuses', () => {
    expect(FEATURE_STATUSES).toEqual([
      'unassigned',
      'assigned',
      'in-progress',
      'complete',
    ]);
  });
});
