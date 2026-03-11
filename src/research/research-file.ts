import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import {
  parseGenericFrontmatter,
  stringifyGenericFrontmatter,
} from '../roadmap/frontmatter.js';
import { slugify } from '../roadmap/slug.js';
import type { ResearchFrontmatter, ResearchArtifact } from './types.js';

const RESEARCH_FIELD_ORDER: (keyof ResearchFrontmatter)[] = [
  'id',
  'topic',
  'status',
  'date',
  'features',
];

/**
 * Parse a raw frontmatter value for research fields.
 * Handles features as inline array `[F-001, F-003]`.
 */
function researchFieldParser(key: string, raw: string): unknown {
  if (raw === 'null' || raw === '') return key === 'features' ? [] : '';
  if (key === 'features') {
    // Parse inline array format: [F-001, F-003]
    const inner = raw.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!inner) return [];
    return inner.split(',').map((s) => s.trim());
  }
  return raw;
}

/**
 * Stringify a research field value for YAML frontmatter.
 */
function researchFieldStringifier(key: string, value: unknown): string {
  if (key === 'features') {
    const arr = value as string[];
    if (!arr || arr.length === 0) return '[]';
    return `[${arr.join(', ')}]`;
  }
  return value === null || value === undefined ? 'null' : String(value);
}

/**
 * Generate a research artifact filename from id and topic.
 * Format: `R-001-auth-patterns.md`
 */
export function researchFilename(id: string, topic: string): string {
  return `${id}-${slugify(topic)}.md`;
}

/**
 * Compute the next research ID from existing IDs.
 * Uses max existing numeric part + 1, padded to 3 digits.
 */
export function nextResearchId(existingIds: string[]): string {
  if (existingIds.length === 0) return 'R-001';

  const nums = existingIds.map((id) => {
    const match = id.match(/R-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  });

  const max = Math.max(...nums);
  return `R-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Write a research artifact to disk with YAML frontmatter and markdown body.
 * Creates directory recursively if needed.
 * Returns the absolute path of the written file.
 */
export async function writeResearchFile(
  dir: string,
  artifact: ResearchArtifact,
): Promise<string> {
  await mkdir(dir, { recursive: true });

  const frontmatter = stringifyGenericFrontmatter(
    {
      id: artifact.id,
      topic: artifact.topic,
      status: artifact.status,
      date: artifact.date,
      features: artifact.features,
    } as unknown as Record<string, unknown>,
    RESEARCH_FIELD_ORDER as unknown as readonly string[],
    researchFieldStringifier,
  );

  const content = `${frontmatter}\n\n${artifact.body}\n`;
  const filepath = join(dir, artifact.filename);
  await writeFile(filepath, content);
  return filepath;
}

/**
 * Read a research artifact from disk, parsing frontmatter and body.
 */
export async function readResearchFile(filepath: string): Promise<ResearchArtifact> {
  const content = await readFile(filepath, 'utf-8');
  const { data, body } = parseGenericFrontmatter<Record<string, unknown>>(
    content,
    researchFieldParser,
  );

  return {
    id: data.id as string,
    topic: data.topic as string,
    status: data.status as ResearchArtifact['status'],
    date: data.date as string,
    features: data.features as string[],
    body,
    filename: basename(filepath),
  };
}

/**
 * Read all research files (R-*.md) from a directory, sorted by id.
 * Returns empty array if directory does not exist or contains no research files.
 */
export async function readAllResearch(dir: string): Promise<ResearchArtifact[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const researchFiles = entries.filter((f) => /^R-\d+.*\.md$/.test(f));
  if (researchFiles.length === 0) return [];

  const artifacts = await Promise.all(
    researchFiles.map((f) => readResearchFile(join(dir, f))),
  );

  return artifacts.sort((a, b) => a.id.localeCompare(b.id));
}
