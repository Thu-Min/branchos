import { describe, it, expect } from 'vitest';
import { slugifyBranch, isProtectedBranch } from '../../src/workstream/resolve.js';

describe('slugifyBranch', () => {
  it('strips feature/ prefix', () => {
    expect(slugifyBranch('feature/payment-retry')).toBe('payment-retry');
  });

  it('strips fix/ prefix', () => {
    expect(slugifyBranch('fix/bug-123')).toBe('bug-123');
  });

  it('strips hotfix/ prefix', () => {
    expect(slugifyBranch('hotfix/urgent')).toBe('urgent');
  });

  it('returns branch name as-is when no prefix to strip', () => {
    expect(slugifyBranch('my-feature')).toBe('my-feature');
  });

  it('lowercases the result', () => {
    expect(slugifyBranch('Feature/Mixed-Case')).toBe('mixed-case');
  });

  it('replaces non-alphanumeric chars with hyphens', () => {
    expect(slugifyBranch('feature/special@chars!here')).toBe('special-chars-here');
  });

  it('collapses and trims hyphens', () => {
    expect(slugifyBranch('feature/--double--hyphens--')).toBe('double-hyphens');
  });
});

describe('isProtectedBranch', () => {
  it('returns true for main', () => {
    expect(isProtectedBranch('main')).toBe(true);
  });

  it('returns true for master', () => {
    expect(isProtectedBranch('master')).toBe(true);
  });

  it('returns true for develop', () => {
    expect(isProtectedBranch('develop')).toBe(true);
  });

  it('returns false for feature branches', () => {
    expect(isProtectedBranch('feature/foo')).toBe(false);
  });
});
