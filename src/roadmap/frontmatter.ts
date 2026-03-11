import type { FeatureFrontmatter, FeatureStatus } from './types.js';

const FEATURE_FIELD_ORDER: (keyof FeatureFrontmatter)[] = [
  'id',
  'title',
  'status',
  'milestone',
  'branch',
  'issue',
  'workstream',
];

/**
 * Split frontmatter delimited by `---` lines into raw key-value pairs and body.
 * Splits on the first `:` only so colons in values are preserved.
 */
function splitFrontmatter(content: string): {
  rawFields: Map<string, string>;
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
  const rawFields = new Map<string, string>();

  for (const line of frontmatterLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();
    rawFields.set(key, rawValue);
  }

  const body = lines
    .slice(secondDelim + 1)
    .join('\n')
    .trim();

  return { rawFields, body };
}

// ── Generic frontmatter functions ──────────────────────────────────────────

/**
 * Parse YAML frontmatter with a custom field parser.
 * The fieldParser receives each (key, rawValue) pair and returns the parsed value.
 */
export function parseGenericFrontmatter<T extends Record<string, unknown>>(
  content: string,
  fieldParser: (key: string, raw: string) => unknown,
): { data: T; body: string } {
  const { rawFields, body } = splitFrontmatter(content);
  const data: Record<string, unknown> = {};

  for (const [key, raw] of rawFields) {
    data[key] = fieldParser(key, raw);
  }

  return { data: data as T, body };
}

/**
 * Stringify a frontmatter object with a custom field stringifier.
 * Fields are written in the specified order.
 */
export function stringifyGenericFrontmatter<T extends Record<string, unknown>>(
  data: T,
  fieldOrder: readonly (keyof T & string)[],
  fieldStringifier: (key: string, value: unknown) => string,
): string {
  const lines = ['---'];
  for (const key of fieldOrder) {
    const value = data[key];
    lines.push(`${key}: ${fieldStringifier(key, value)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ── Feature-specific wrappers (backward compatible) ────────────────────────

function parseFeatureValue(key: string, raw: string): string | number | null | FeatureStatus {
  if (raw === 'null') return null;
  if (key === 'issue') {
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  }
  return raw;
}

function stringifyFeatureValue(_key: string, value: unknown): string {
  return value === null || value === undefined ? 'null' : String(value);
}

/**
 * Parse YAML frontmatter delimited by `---` lines.
 * Splits on the first `:` only so colons in values are preserved.
 */
export function parseFrontmatter(content: string): {
  data: FeatureFrontmatter;
  body: string;
} {
  const result = parseGenericFrontmatter<Record<string, unknown>>(content, parseFeatureValue);
  return { data: result.data as unknown as FeatureFrontmatter, body: result.body };
}

/**
 * Stringify a FeatureFrontmatter object to a YAML frontmatter block.
 * Fields are written in a fixed order.
 */
export function stringifyFrontmatter(data: FeatureFrontmatter): string {
  return stringifyGenericFrontmatter(
    data as unknown as Record<string, unknown>,
    FEATURE_FIELD_ORDER as unknown as readonly string[],
    stringifyFeatureValue,
  );
}
