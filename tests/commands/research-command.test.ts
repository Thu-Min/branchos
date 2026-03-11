import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const COMMANDS_DIR = path.resolve(__dirname, '../../commands');
const RESEARCH_FILE = path.join(COMMANDS_DIR, 'branchos:research.md');

describe('research command', () => {
  it('file exists in commands/ directory', () => {
    expect(fs.existsSync(RESEARCH_FILE)).toBe(true);
  });

  it('has valid YAML frontmatter with description and allowed-tools', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content.startsWith('---\n')).toBe(true);
    const secondDash = content.indexOf('---', 4);
    expect(secondDash).toBeGreaterThan(0);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('description:');
    expect(frontmatter).toContain('allowed-tools:');
  });

  it('frontmatter includes AskUserQuestion in allowed-tools (INT-01)', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    const secondDash = content.indexOf('---', 4);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('AskUserQuestion');
  });

  it('frontmatter includes WebSearch in allowed-tools', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    const secondDash = content.indexOf('---', 4);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('WebSearch');
  });

  it('frontmatter includes WebFetch in allowed-tools', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    const secondDash = content.indexOf('---', 4);
    const frontmatter = content.slice(4, secondDash);
    expect(frontmatter).toContain('WebFetch');
  });

  it('contains $ARGUMENTS placeholder', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toContain('$ARGUMENTS');
  });

  it('contains structured option presentation with numbered options (INT-01)', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    // Should have numbered option pattern like "1." "2." etc.
    expect(content).toMatch(/\d+\.\s/);
  });

  it('contains freeform "Other" option instructions (INT-02)', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toContain('Other');
  });

  it('contains adaptive questioning language (INT-03)', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    const lower = content.toLowerCase();
    // Should contain adaptive language patterns
    expect(lower).toMatch(/adapt/);
    expect(lower).toMatch(/based on.*response/);
    expect(lower).toMatch(/if the user/);
  });

  it('contains --save flag handling instructions', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toContain('--save');
  });

  it('contains "## Summary" section mandate for saved artifacts', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toContain('## Summary');
  });

  it('references writeResearchFile or research-file for persistence', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toMatch(/writeResearchFile|research-file/);
  });

  it('references nextResearchId for ID generation', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toContain('nextResearchId');
  });

  it('references readIndex for existing research lookup', () => {
    const content = fs.readFileSync(RESEARCH_FILE, 'utf-8');
    expect(content).toMatch(/readIndex|index\.json/);
  });
});
