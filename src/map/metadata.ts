export interface MapMetadata {
  generated: string;
  commit: string;
  generator: string;
}

export const MAP_FILES: string[] = [
  'ARCHITECTURE.md',
  'MODULES.md',
  'CONVENTIONS.md',
  'STACK.md',
  'CONCERNS.md',
];

const REQUIRED_FIELDS: (keyof MapMetadata)[] = [
  'generated',
  'commit',
  'generator',
];

export function parseMapMetadata(content: string): MapMetadata | null {
  if (!content.startsWith('---')) {
    return null;
  }

  const parts = content.split('---');
  // parts[0] is empty (before first ---), parts[1] is frontmatter, parts[2]+ is content
  if (parts.length < 3) {
    return null;
  }

  const frontmatter = parts[1].trim();
  const fields: Record<string, string> = {};

  for (const line of frontmatter.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    fields[key] = value;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!fields[field]) {
      return null;
    }
  }

  return {
    generated: fields.generated,
    commit: fields.commit,
    generator: fields.generator,
  };
}
