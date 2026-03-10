import { describe, it, expect } from 'vitest';
import { slugify, featureFilename, featureBranch } from '../../src/roadmap/slug.js';

describe('slugify', () => {
  it('converts to lowercase with hyphens', () => {
    expect(slugify('User Authentication')).toBe('user-authentication');
  });

  it('strips special characters', () => {
    expect(slugify('Auth: OAuth2 Flow!!!')).toBe('auth-oauth2-flow');
  });

  it('truncates to 50 chars without trailing hyphen', () => {
    const long = 'This Is A Very Long Feature Title That Exceeds Fifty Characters Limit';
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).not.toMatch(/-$/);
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
  });
});

describe('featureFilename', () => {
  it('combines id and slugified title', () => {
    expect(featureFilename('F-001', 'User Auth')).toBe('F-001-user-auth.md');
  });
});

describe('featureBranch', () => {
  it('generates feature branch name from title', () => {
    expect(featureBranch('User Auth')).toBe('feature/user-auth');
  });
});
