import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = resolve(
  import.meta.dirname,
  '../../.claude/commands/branchos:map-codebase.md',
);

describe('map-codebase slash command', () => {
  let content: string;

  it('file exists and is readable', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('starts with valid YAML frontmatter', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    expect(content.startsWith('---')).toBe(true);
    const parts = content.split('---');
    // parts[0] is empty, parts[1] is frontmatter, parts[2]+ is body
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it('frontmatter contains description field', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    const parts = content.split('---');
    const frontmatter = parts[1];
    expect(frontmatter).toContain('description:');
  });

  it('body references all 5 map file names', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    const mapFiles = [
      'ARCHITECTURE.md',
      'MODULES.md',
      'CONVENTIONS.md',
      'STACK.md',
      'CONCERNS.md',
    ];
    for (const file of mapFiles) {
      expect(content).toContain(file);
    }
  });

  it('body contains $ARGUMENTS', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    expect(content).toContain('$ARGUMENTS');
  });

  it('body mentions .branchos/shared/codebase/', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    expect(content).toContain('.branchos/shared/codebase/');
  });

  it('body mentions the commit message format', () => {
    content = readFileSync(COMMAND_PATH, 'utf-8');
    expect(content).toContain('chore(branchos): refresh codebase map');
  });
});
