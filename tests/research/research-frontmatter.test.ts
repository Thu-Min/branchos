import { describe, it, expect } from 'vitest';
import { parseGenericFrontmatter, stringifyGenericFrontmatter } from '../../src/roadmap/frontmatter.js';
import { parseFrontmatter, stringifyFrontmatter } from '../../src/roadmap/frontmatter.js';
import { RESEARCH_STATUSES } from '../../src/research/types.js';
import type { ResearchFrontmatter } from '../../src/research/types.js';

const RESEARCH_FIELD_ORDER: (keyof ResearchFrontmatter)[] = [
  'id', 'topic', 'status', 'date', 'features',
];

function parseResearchField(key: string, raw: string): unknown {
  if (raw === 'null') return null;
  if (key === 'features') {
    const trimmed = raw.trim();
    if (trimmed === '[]') return [];
    return trimmed
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  return raw;
}

function stringifyResearchField(key: string, value: unknown): string {
  if (key === 'features') {
    const arr = value as string[];
    if (arr.length === 0) return '[]';
    return `[${arr.join(', ')}]`;
  }
  return value === null || value === undefined ? 'null' : String(value);
}

describe('research frontmatter parsing', () => {
  it('parses research content with features array [F-001, F-003]', () => {
    const input = [
      '---',
      'id: R-001',
      'topic: Authentication Patterns',
      'status: draft',
      'date: 2026-03-11',
      'features: [F-001, F-003]',
      '---',
      '',
      '## Summary',
    ].join('\n');

    const result = parseGenericFrontmatter<ResearchFrontmatter>(input, parseResearchField);
    expect(result.data.id).toBe('R-001');
    expect(result.data.topic).toBe('Authentication Patterns');
    expect(result.data.status).toBe('draft');
    expect(result.data.date).toBe('2026-03-11');
    expect(result.data.features).toEqual(['F-001', 'F-003']);
  });

  it('parses research with empty features array []', () => {
    const input = [
      '---',
      'id: R-002',
      'topic: Empty Topic',
      'status: draft',
      'date: 2026-03-11',
      'features: []',
      '---',
      '',
      'Body',
    ].join('\n');

    const result = parseGenericFrontmatter<ResearchFrontmatter>(input, parseResearchField);
    expect(result.data.features).toEqual([]);
  });

  it('parses research with single feature [F-001]', () => {
    const input = [
      '---',
      'id: R-003',
      'topic: Single Feature',
      'status: complete',
      'date: 2026-03-11',
      'features: [F-001]',
      '---',
      '',
      'Body',
    ].join('\n');

    const result = parseGenericFrontmatter<ResearchFrontmatter>(input, parseResearchField);
    expect(result.data.features).toEqual(['F-001']);
  });

  it('parses research with status draft/complete', () => {
    const draftInput = [
      '---',
      'id: R-001',
      'topic: Test',
      'status: draft',
      'date: 2026-03-11',
      'features: []',
      '---',
      '',
      'Body',
    ].join('\n');

    const completeInput = [
      '---',
      'id: R-002',
      'topic: Test',
      'status: complete',
      'date: 2026-03-11',
      'features: []',
      '---',
      '',
      'Body',
    ].join('\n');

    expect(parseGenericFrontmatter<ResearchFrontmatter>(draftInput, parseResearchField).data.status).toBe('draft');
    expect(parseGenericFrontmatter<ResearchFrontmatter>(completeInput, parseResearchField).data.status).toBe('complete');
  });
});

describe('research frontmatter stringify', () => {
  it('round-trips with parseGenericFrontmatter (features array preserved)', () => {
    const data: ResearchFrontmatter = {
      id: 'R-001',
      topic: 'Authentication Patterns',
      status: 'draft',
      date: '2026-03-11',
      features: ['F-001', 'F-003'],
    };

    const stringified = stringifyGenericFrontmatter(data, RESEARCH_FIELD_ORDER, stringifyResearchField);
    const parsed = parseGenericFrontmatter<ResearchFrontmatter>(stringified + '\n\nBody here', parseResearchField);
    expect(parsed.data).toEqual(data);
  });

  it('writes features as inline array format [F-001, F-003]', () => {
    const data: ResearchFrontmatter = {
      id: 'R-001',
      topic: 'Test',
      status: 'draft',
      date: '2026-03-11',
      features: ['F-001', 'F-003'],
    };

    const result = stringifyGenericFrontmatter(data, RESEARCH_FIELD_ORDER, stringifyResearchField);
    expect(result).toContain('features: [F-001, F-003]');
  });
});

describe('feature backward compatibility (regression)', () => {
  it('existing parseFrontmatter(content) still works for features', () => {
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
      workstream: null,
    });
    expect(result.body).toBe('# Body');
  });

  it('existing stringifyFrontmatter(data) still works for features', () => {
    const data = {
      id: 'F-001',
      title: 'User Auth',
      status: 'unassigned' as const,
      milestone: 'M1',
      branch: 'feature/user-auth',
      issue: null,
      workstream: null,
    };

    const stringified = stringifyFrontmatter(data);
    const parsed = parseFrontmatter(stringified + '\n\nBody here');
    expect(parsed.data).toEqual(data);
  });
});

describe('RESEARCH_STATUSES', () => {
  it('contains exactly [draft, complete]', () => {
    expect(RESEARCH_STATUSES).toEqual(['draft', 'complete']);
  });
});
