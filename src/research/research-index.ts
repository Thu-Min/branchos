import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResearchIndexEntry } from './types.js';
import { readAllResearch } from './research-file.js';

/**
 * Rebuild index.json from all R-*.md files in the directory.
 * Creates the directory if it doesn't exist.
 * Returns the index entries.
 */
export async function rebuildIndex(dir: string): Promise<ResearchIndexEntry[]> {
  await mkdir(dir, { recursive: true });

  const artifacts = await readAllResearch(dir);

  const entries: ResearchIndexEntry[] = artifacts.map((a) => ({
    id: a.id,
    topic: a.topic,
    status: a.status,
    date: a.date,
    features: a.features,
    filename: a.filename,
  }));

  await writeFile(join(dir, 'index.json'), JSON.stringify(entries, null, 2));
  return entries;
}

/**
 * Read the index.json file from a directory.
 * Returns empty array on any error (missing file, parse error, missing directory).
 */
export async function readIndex(dir: string): Promise<ResearchIndexEntry[]> {
  try {
    const content = await readFile(join(dir, 'index.json'), 'utf-8');
    return JSON.parse(content) as ResearchIndexEntry[];
  } catch {
    return [];
  }
}

/**
 * Find research entries that reference a given feature ID.
 * Reads from index.json and filters by features array.
 */
export async function findResearchByFeature(
  dir: string,
  featureId: string,
): Promise<ResearchIndexEntry[]> {
  const entries = await readIndex(dir);
  return entries.filter((entry) => entry.features.includes(featureId));
}
