import { describe, it, expect } from 'vitest';
import { detectSections, isLikelyPrfaq } from '../../src/prfaq/validate.js';

describe('detectSections', () => {
  it('identifies present and missing sections from partial content', () => {
    const content = '## Problem\nSome text\n## Solution\nMore text\n## Customer FAQ\nFAQ items';
    const result = detectSections(content);

    expect(result.found).toContain('problem');
    expect(result.found).toContain('solution');
    expect(result.found).toContain('customer-faq');
    expect(result.found).toHaveLength(3);

    expect(result.missing).toContain('headline');
    expect(result.missing).toContain('subheadline');
    expect(result.missing).toContain('quote');
    expect(result.missing).toContain('cta');
    expect(result.missing).toContain('internal-faq');
    expect(result.missing).toHaveLength(5);
  });

  it('returns all 8 found when all expected sections present', () => {
    const content = [
      '## Headline',
      'Press release headline text',
      '## Subheadline',
      'Subtitle text',
      '## Problem',
      'Problem description',
      '## Solution',
      'Solution description',
      '## Quote',
      'A leadership quote',
      '## Call to Action',
      'Getting started info',
      '## Customer FAQ',
      'Q&A items',
      '## Internal FAQ',
      'Internal Q&A items',
    ].join('\n');

    const result = detectSections(content);
    expect(result.found).toHaveLength(8);
    expect(result.missing).toHaveLength(0);
  });

  it('ignores headings inside fenced code blocks', () => {
    const content = [
      '## Problem',
      'Some text',
      '```',
      '## Solution',
      '## Quote',
      '```',
      '## Customer FAQ',
      'FAQ items',
    ].join('\n');

    const result = detectSections(content);
    expect(result.found).toContain('problem');
    expect(result.found).toContain('customer-faq');
    expect(result.found).not.toContain('solution');
    expect(result.found).not.toContain('quote');
    expect(result.found).toHaveLength(2);
  });

  it('is case-insensitive for heading matching', () => {
    const content = '## PROBLEM\nText\n## SOLUTION\nText';
    const result = detectSections(content);

    expect(result.found).toContain('problem');
    expect(result.found).toContain('solution');
  });

  it('handles heading variations like "Customer Problem"', () => {
    const content = '## Customer Problem\nText\n## Leadership Quote\nText';
    const result = detectSections(content);

    expect(result.found).toContain('problem');
    expect(result.found).toContain('quote');
  });

  it('handles empty string input returning all missing', () => {
    const result = detectSections('');

    expect(result.found).toHaveLength(0);
    expect(result.missing).toHaveLength(8);
  });

  it('handles headings with different heading levels', () => {
    const content = '# Problem\nText\n### Solution\nText';
    const result = detectSections(content);

    expect(result.found).toContain('problem');
    expect(result.found).toContain('solution');
  });
});

describe('isLikelyPrfaq', () => {
  it('returns true when 2+ expected sections found', () => {
    const content = '## Problem\nText\n## Solution\nText';
    expect(isLikelyPrfaq(content)).toBe(true);
  });

  it('returns false when fewer than 2 expected sections found', () => {
    const content = '## Problem\nText';
    expect(isLikelyPrfaq(content)).toBe(false);
  });

  it('returns false for empty content', () => {
    expect(isLikelyPrfaq('')).toBe(false);
  });

  it('returns true at exactly 2 sections', () => {
    const content = '## Headline\nText\n## Subheadline\nText';
    expect(isLikelyPrfaq(content)).toBe(true);
  });
});
