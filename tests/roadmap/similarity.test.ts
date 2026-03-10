import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  titleSimilarity,
  matchFeaturesByTitle,
} from '../../src/roadmap/similarity.js';
import type { Feature } from '../../src/roadmap/types.js';

function makeFeature(id: string, title: string): Feature {
  return {
    id,
    title,
    status: 'unassigned',
    milestone: 'M1',
    branch: `feature/${id}`,
    issue: null,
    workstream: null,
    body: '',
    filename: `${id}.md`,
  };
}

describe('levenshteinDistance', () => {
  it('returns 3 for kitten/sitting', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });
});

describe('titleSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(titleSimilarity('User Auth', 'User Auth')).toBe(1.0);
  });

  it('returns 1.0 for case-insensitive match', () => {
    expect(titleSimilarity('User Auth', 'user auth')).toBe(1.0);
  });

  it('returns > 0.5 for similar strings', () => {
    const sim = titleSimilarity('User Authentication', 'User Auth System');
    expect(sim).toBeGreaterThan(0.5);
  });

  it('returns < 0.4 for completely different strings', () => {
    const sim = titleSimilarity('Completely Different', 'Nothing Similar');
    expect(sim).toBeLessThan(0.4);
  });

  it('returns 1.0 for both empty strings', () => {
    expect(titleSimilarity('', '')).toBe(1.0);
  });
});

describe('matchFeaturesByTitle', () => {
  it('matches features with similarity >= threshold', () => {
    const oldFeatures = [
      makeFeature('F-001', 'User Auth'),
      makeFeature('F-002', 'Dashboard Layout'),
    ];
    const newTitles = ['User Auth v2', 'Dashboard Layout'];

    const result = matchFeaturesByTitle(oldFeatures, newTitles);

    expect(result.matched.length).toBe(2);
    expect(result.dropped.length).toBe(0);
    expect(result.added.length).toBe(0);
  });

  it('identifies dropped features (no match in new titles)', () => {
    const oldFeatures = [
      makeFeature('F-001', 'User Auth'),
      makeFeature('F-002', 'Legacy Module'),
    ];
    const newTitles = ['User Auth v2'];

    const result = matchFeaturesByTitle(oldFeatures, newTitles);

    expect(result.matched.length).toBe(1);
    expect(result.matched[0].oldFeature.id).toBe('F-001');
    expect(result.dropped.length).toBe(1);
    expect(result.dropped[0].id).toBe('F-002');
  });

  it('identifies added features (new titles without old match)', () => {
    const oldFeatures = [makeFeature('F-001', 'User Auth')];
    const newTitles = ['User Auth v2', 'Brand New Feature'];

    const result = matchFeaturesByTitle(oldFeatures, newTitles);

    expect(result.matched.length).toBe(1);
    expect(result.added.length).toBe(1);
    expect(result.added[0]).toBe('Brand New Feature');
  });

  it('assigns each old feature to at most one new feature (greedy)', () => {
    const oldFeatures = [
      makeFeature('F-001', 'Auth System'),
      makeFeature('F-002', 'Auth Module'),
    ];
    const newTitles = ['Auth System v2'];

    const result = matchFeaturesByTitle(oldFeatures, newTitles);

    // Only one match possible - best match wins
    expect(result.matched.length).toBe(1);
    expect(result.dropped.length).toBe(1);
    expect(result.added.length).toBe(0);
  });

  it('respects custom threshold', () => {
    const oldFeatures = [makeFeature('F-001', 'User Auth')];
    const newTitles = ['User Auth v2'];

    // Very high threshold - should not match
    const strict = matchFeaturesByTitle(oldFeatures, newTitles, 0.99);
    expect(strict.matched.length).toBe(0);
    expect(strict.dropped.length).toBe(1);
    expect(strict.added.length).toBe(1);
  });
});
