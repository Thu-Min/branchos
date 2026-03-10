import type { FeatureFrontmatter, FeatureStatus } from './types.js';

const FIELD_ORDER: (keyof FeatureFrontmatter)[] = [
  'id',
  'title',
  'status',
  'milestone',
  'branch',
  'issue',
];

/**
 * Parse YAML frontmatter delimited by `---` lines.
 * Splits on the first `:` only so colons in values are preserved.
 */
export function parseFrontmatter(content: string): {
  data: FeatureFrontmatter;
  body: string;
} {
  const lines = content.split('\n');
  const firstDelim = lines.indexOf('---');
  if (firstDelim === -1) {
    throw new Error('Missing frontmatter delimiters');
  }
  const secondDelim = lines.indexOf('---', firstDelim + 1);
  if (secondDelim === -1) {
    throw new Error('Missing closing frontmatter delimiter');
  }

  const frontmatterLines = lines.slice(firstDelim + 1, secondDelim);
  const data: Record<string, unknown> = {};

  for (const line of frontmatterLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();
    data[key] = parseValue(key, rawValue);
  }

  const body = lines
    .slice(secondDelim + 1)
    .join('\n')
    .trim();

  return { data: data as FeatureFrontmatter, body };
}

function parseValue(key: string, raw: string): string | number | null | FeatureStatus {
  if (raw === 'null') return null;
  if (key === 'issue') {
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  }
  return raw;
}

/**
 * Stringify a FeatureFrontmatter object to a YAML frontmatter block.
 * Fields are written in a fixed order.
 */
export function stringifyFrontmatter(data: FeatureFrontmatter): string {
  const lines = ['---'];
  for (const key of FIELD_ORDER) {
    const value = data[key];
    lines.push(`${key}: ${value === null ? 'null' : value}`);
  }
  lines.push('---');
  return lines.join('\n');
}
