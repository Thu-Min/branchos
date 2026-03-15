import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.js';
import type { Feature } from './types.js';

/**
 * Write a feature file to disk with YAML frontmatter and markdown body.
 * Creates directory recursively if needed.
 * Returns the absolute path of the written file.
 */
export async function writeFeatureFile(dir: string, feature: Feature): Promise<string> {
  await mkdir(dir, { recursive: true });

  const frontmatter = stringifyFrontmatter({
    id: feature.id,
    title: feature.title,
    status: feature.status,
    milestone: feature.milestone,
    branch: feature.branch,
    issue: feature.issue,
    workstream: feature.workstream ?? null,
    assignee: feature.assignee ?? null,
  });

  const content = `${frontmatter}\n\n${feature.body}\n`;
  const filepath = join(dir, feature.filename);
  await writeFile(filepath, content);
  return filepath;
}

/**
 * Read a feature file from disk, parsing frontmatter and body.
 */
export async function readFeatureFile(filepath: string): Promise<Feature> {
  const content = await readFile(filepath, 'utf-8');
  const { data, body } = parseFrontmatter(content);

  return {
    ...data,
    body,
    filename: basename(filepath),
  };
}

/**
 * Read all feature files (F-*.md) from a directory, sorted by id.
 * Returns empty array if directory does not exist or contains no features.
 */
export async function readAllFeatures(dir: string): Promise<Feature[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const featureFiles = entries.filter((f) => /^F-\d+.*\.md$/.test(f));
  if (featureFiles.length === 0) return [];

  const features = await Promise.all(
    featureFiles.map((f) => readFeatureFile(join(dir, f))),
  );

  return features.sort((a, b) => a.id.localeCompare(b.id));
}
