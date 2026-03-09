import { EXPECTED_SECTIONS } from './types.js';

/**
 * Detect which PR-FAQ sections are present in the given markdown content.
 * Handles code block exclusion and case-insensitive fuzzy matching.
 */
export function detectSections(content: string): { found: string[]; missing: string[] } {
  const lines = content.split('\n');
  let inCodeBlock = false;

  const headings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle code block state on fenced code block markers
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) continue;

    // Match heading lines (any level: #, ##, ###, etc.)
    if (trimmed.startsWith('#')) {
      const headingText = trimmed.replace(/^#+\s*/, '').toLowerCase().trim();
      if (headingText) {
        headings.push(headingText);
      }
    }
  }

  const found: string[] = [];
  const missing: string[] = [];

  for (const section of EXPECTED_SECTIONS) {
    const matched = headings.some((h) =>
      section.patterns.some((p) => h.includes(p)),
    );
    if (matched) {
      found.push(section.id);
    } else {
      missing.push(section.id);
    }
  }

  return { found, missing };
}

/**
 * Returns true if the content has at least 2 recognized PR-FAQ sections.
 */
export function isLikelyPrfaq(content: string): boolean {
  return detectSections(content).found.length >= 2;
}
