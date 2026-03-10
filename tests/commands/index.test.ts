import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMANDS_DIR = path.resolve(__dirname, '../../commands');

const EXPECTED_FILES = [
  'branchos:map-codebase.md',
  'branchos:context.md',
  'branchos:discuss-phase.md',
  'branchos:plan-phase.md',
  'branchos:execute-phase.md',
  'branchos:ingest-prfaq.md',
  'branchos:plan-roadmap.md',
  'branchos:features.md',
  'branchos:sync-issues.md',
  'branchos:refresh-roadmap.md',
  'branchos:create-workstream.md',
  'branchos:list-workstreams.md',
  'branchos:status.md',
  'branchos:archive.md',
];

describe('slash command .md files', () => {
  it('has 14 .md files in commands/ directory', () => {
    const files = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md'));
    expect(files).toHaveLength(14);
  });

  it.each(EXPECTED_FILES)('%s exists', (filename) => {
    const filePath = path.join(COMMANDS_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it.each(EXPECTED_FILES)(
    '%s has valid YAML frontmatter with description and allowed-tools',
    (filename) => {
      const content = fs.readFileSync(path.join(COMMANDS_DIR, filename), 'utf-8');
      // Starts with ---
      expect(content.startsWith('---\n')).toBe(true);
      // Has closing ---
      const secondDash = content.indexOf('---', 4);
      expect(secondDash).toBeGreaterThan(0);
      // Has description
      const frontmatter = content.slice(4, secondDash);
      expect(frontmatter).toContain('description:');
      // Has allowed-tools
      expect(frontmatter).toContain('allowed-tools:');
    },
  );

  it.each(EXPECTED_FILES)('%s contains $ARGUMENTS placeholder', (filename) => {
    const content = fs.readFileSync(path.join(COMMANDS_DIR, filename), 'utf-8');
    expect(content).toContain('$ARGUMENTS');
  });

  it('create-workstream.md references npx branchos workstream create', () => {
    const content = fs.readFileSync(
      path.join(COMMANDS_DIR, 'branchos:create-workstream.md'),
      'utf-8',
    );
    expect(content).toContain('npx branchos workstream create');
  });

  it('list-workstreams.md references npx branchos workstream list', () => {
    const content = fs.readFileSync(
      path.join(COMMANDS_DIR, 'branchos:list-workstreams.md'),
      'utf-8',
    );
    expect(content).toContain('npx branchos workstream list');
  });

  it('status.md references map-status, check-drift, and detect-conflicts', () => {
    const content = fs.readFileSync(path.join(COMMANDS_DIR, 'branchos:status.md'), 'utf-8');
    expect(content).toContain('map-status');
    expect(content).toContain('check-drift');
    expect(content).toContain('detect-conflicts');
  });

  it('archive.md references npx branchos archive', () => {
    const content = fs.readFileSync(path.join(COMMANDS_DIR, 'branchos:archive.md'), 'utf-8');
    expect(content).toContain('npx branchos archive');
  });
});
