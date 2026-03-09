import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrfaqMeta, SectionDiff } from './types.js';

const META_FILENAME = 'prfaq-meta.json';

/**
 * Hash content with CRLF normalization for cross-platform stability.
 */
export function hashContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

/**
 * Read PR-FAQ metadata from the shared directory.
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function readMeta(sharedDir: string): Promise<PrfaqMeta | null> {
  try {
    const raw = await readFile(join(sharedDir, META_FILENAME), 'utf-8');
    return JSON.parse(raw) as PrfaqMeta;
  } catch {
    return null;
  }
}

/**
 * Write PR-FAQ metadata to the shared directory.
 */
export async function writeMeta(sharedDir: string, meta: PrfaqMeta): Promise<void> {
  await writeFile(
    join(sharedDir, META_FILENAME),
    JSON.stringify(meta, null, 2) + '\n',
  );
}

/**
 * Split markdown content into sections by heading boundaries.
 * Returns a map of lowercase heading text to the content below it.
 * Respects fenced code blocks (won't split on headings inside them).
 */
export function splitIntoSections(content: string): Map<string, string> {
  const lines = content.split('\n');
  const sections = new Map<string, string>();
  let inCodeBlock = false;
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (currentHeading !== null) {
        currentContent.push(line);
      }
      continue;
    }

    if (!inCodeBlock && trimmed.startsWith('#')) {
      // Save previous section
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join('\n').trim());
      }
      currentHeading = trimmed.replace(/^#+\s*/, '').toLowerCase().trim();
      currentContent = [];
    } else {
      if (currentHeading !== null) {
        currentContent.push(line);
      }
    }
  }

  // Save final section
  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join('\n').trim());
  }

  return sections;
}

/**
 * Compare two markdown documents and report section-level differences.
 */
export function diffSections(oldContent: string, newContent: string): SectionDiff {
  const oldSections = splitIntoSections(oldContent);
  const newSections = splitIntoSections(newContent);

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Find added and modified sections
  for (const [heading, content] of newSections) {
    if (!oldSections.has(heading)) {
      added.push(heading);
    } else if (oldSections.get(heading) !== content) {
      modified.push(heading);
    }
  }

  // Find removed sections
  for (const heading of oldSections.keys()) {
    if (!newSections.has(heading)) {
      removed.push(heading);
    }
  }

  return { added, removed, modified };
}
