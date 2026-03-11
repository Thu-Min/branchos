import { describe, it, expect } from 'vitest';
import { extractSummary } from '../../src/research/extract-summary.js';

describe('extractSummary', () => {
  it('returns content between ## Summary and next H2', () => {
    const body = '## Summary\n\n- bullet1\n- bullet2\n\n## Findings';
    expect(extractSummary(body)).toBe('- bullet1\n- bullet2');
  });

  it('returns content between ## Summary and next H2 (simple)', () => {
    const body = '## Summary\n\ncontent\n\n## Next Section';
    expect(extractSummary(body)).toBe('content');
  });

  it('returns null when no ## Summary heading exists', () => {
    const body = '## Introduction\n\nSome text\n\n## Findings\n\nMore text';
    expect(extractSummary(body)).toBeNull();
  });

  it('returns everything after ## Summary when it is the last section', () => {
    const body = '## Summary\n\nThis is the last section content\n\n- item1\n- item2';
    expect(extractSummary(body)).toBe('This is the last section content\n\n- item1\n- item2');
  });

  it('returns empty string when ## Summary heading exists but content is empty', () => {
    const body = '## Summary\n\n## Findings';
    expect(extractSummary(body)).toBe('');
  });

  it('stops at first following H2 when multiple H2s follow', () => {
    const body = '## Summary\n\nSummary content\n\n## Findings\n\nFindings text\n\n## Conclusion';
    expect(extractSummary(body)).toBe('Summary content');
  });

  it('does not match ## Summary of Findings (must be exactly ## Summary)', () => {
    const body = '## Summary of Findings\n\nSome text\n\n## Other';
    expect(extractSummary(body)).toBeNull();
  });
});
