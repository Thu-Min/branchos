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

describe('workstream field', () => {
  it('stringifyFrontmatter outputs workstream: null', () => {
    const data = {
      id: 'F-001',
      title: 'User Auth',
      status: 'unassigned' as const,
      milestone: 'M1',
      branch: 'feature/user-auth',
      issue: null,
      workstream: null,
    };

    const result = stringifyFrontmatter(data);
    expect(result).toContain('workstream: null');
  });

  it('stringifyFrontmatter outputs workstream string value', () => {
    const data = {
      id: 'F-001',
      title: 'User Auth',
      status: 'in-progress' as const,
      milestone: 'M1',
      branch: 'feature/user-auth',
      issue: null,
      workstream: 'user-auth',
    };

    const result = stringifyFrontmatter(data);
    expect(result).toContain('workstream: user-auth');
  });

  it('parseFrontmatter reads workstream: null', () => {
    const input = [
      '---',
      'id: F-001',
      'title: User Auth',
      'status: unassigned',
      'milestone: M1',
      'branch: feature/user-auth',
      'issue: null',
      'workstream: null',
      '---',
      '',
      'Body',
    ].join('\n');

    const result = parseFrontmatter(input);
    expect(result.data.workstream).toBeNull();
  });

  it('parseFrontmatter reads workstream string value', () => {
    const input = [
      '---',
      'id: F-002',
      'title: Dashboard',
      'status: in-progress',
      'milestone: M2',
      'branch: feature/dashboard',
      'issue: 42',
      'workstream: dashboard-ui',
      '---',
      '',
      'Body',
    ].join('\n');

    const result = parseFrontmatter(input);
    expect(result.data.workstream).toBe('dashboard-ui');
  });

  it('round-trips with workstream field', () => {
    const data = {
      id: 'F-005',
      title: 'Payments',
      status: 'in-progress' as const,
      milestone: 'M3',
      branch: 'feature/payments',
      issue: 10,
      workstream: 'payments',
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
