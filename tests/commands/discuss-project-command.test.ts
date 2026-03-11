import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMANDS_DIR = path.resolve(__dirname, '../../commands');
const DISCUSS_PROJECT_FILE = path.join(COMMANDS_DIR, 'branchos:discuss-project.md');

describe('discuss-project command', () => {
  it('file exists in commands/ directory', () => {
    expect(fs.existsSync(DISCUSS_PROJECT_FILE)).toBe(true);
  });

  it('has valid YAML frontmatter with description and allowed-tools', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content.startsWith('---\n')).toBe(true);
    const secondDash = content.indexOf('---', 4);
    expect(secondDash).toBeGreaterThan(0);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('description:');
    expect(frontmatter).toContain('allowed-tools:');
  });

  it('frontmatter includes AskUserQuestion in allowed-tools (DISC-01)', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    const secondDash = content.indexOf('---', 4);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('AskUserQuestion');
  });

  it('contains $ARGUMENTS placeholder', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content).toContain('$ARGUMENTS');
  });

  it('references all 8 PR-FAQ sections', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    const lower = content.toLowerCase();
    expect(lower).toContain('headline');
    expect(lower).toContain('subheadline');
    expect(lower).toContain('problem');
    expect(lower).toContain('solution');
    expect(lower).toContain('quote');
    expect(lower).toContain('call to action');
    expect(lower).toContain('customer faq');
    expect(lower).toContain('internal faq');
  });

  it('contains opening bookend (codebase context loading) (DISC-02)', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content).toContain('ARCHITECTURE.md');
  });

  it('contains closing bookend (save/write flow) (DISC-02)', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content).toContain('PR-FAQ.md');
    expect(content).toContain('ingest-prfaq');
  });

  it('references PR-FAQ.md output file (DISC-03)', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content).toContain('PR-FAQ.md');
  });

  it('references ingest-prfaq for pipeline delegation (DISC-03)', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    expect(content).toContain('npx branchos ingest-prfaq');
  });

  it('contains adaptive questioning language', () => {
    const content = fs.readFileSync(DISCUSS_PROJECT_FILE, 'utf-8');
    const lower = content.toLowerCase();
    expect(lower).toMatch(/adapt/);
    expect(lower).toMatch(/based on.*response/);
  });
});
