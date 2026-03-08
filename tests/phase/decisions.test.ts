import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  formatDecisionEntry,
  readDecisions,
  appendDecision,
  DecisionEntry,
} from '../../src/phase/decisions.js';

describe('formatDecisionEntry', () => {
  it('produces markdown with title, phase, context, choice, alternatives', () => {
    const entry: DecisionEntry = {
      title: 'Use JWT for auth',
      phase: 1,
      context: 'Need stateless authentication',
      choice: 'JWT with refresh rotation',
      alternatives: ['Session cookies', 'OAuth only'],
    };
    const result = formatDecisionEntry(entry);
    expect(result).toContain('### Use JWT for auth');
    expect(result).toContain('**Phase:** 1');
    expect(result).toContain('**Context:** Need stateless authentication');
    expect(result).toContain('**Decision:** JWT with refresh rotation');
    expect(result).toContain('**Alternatives considered:**');
    expect(result).toContain('- Session cookies');
    expect(result).toContain('- OAuth only');
    expect(result).toContain('---');
  });
});

describe('readDecisions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-decisions-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty string if file does not exist', async () => {
    const result = await readDecisions(join(tempDir, 'nonexistent.md'));
    expect(result).toBe('');
  });

  it('returns file content when file exists', async () => {
    const filePath = join(tempDir, 'decisions.md');
    await writeFile(filePath, '# Decisions\n\nSome content\n');
    const result = await readDecisions(filePath);
    expect(result).toContain('# Decisions');
    expect(result).toContain('Some content');
  });
});

describe('appendDecision', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-decisions-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates decisions.md if it does not exist', async () => {
    const filePath = join(tempDir, 'decisions.md');
    const entry: DecisionEntry = {
      title: 'Test Decision',
      phase: 1,
      context: 'Testing',
      choice: 'Option A',
      alternatives: ['Option B'],
    };
    await appendDecision(filePath, entry);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('# Decisions');
    expect(content).toContain('### Test Decision');
  });

  it('appends to existing decisions.md without overwriting', async () => {
    const filePath = join(tempDir, 'decisions.md');
    const entry1: DecisionEntry = {
      title: 'First Decision',
      phase: 1,
      context: 'First context',
      choice: 'Choice 1',
      alternatives: ['Alt 1'],
    };
    const entry2: DecisionEntry = {
      title: 'Second Decision',
      phase: 2,
      context: 'Second context',
      choice: 'Choice 2',
      alternatives: ['Alt 2'],
    };
    await appendDecision(filePath, entry1);
    await appendDecision(filePath, entry2);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('### First Decision');
    expect(content).toContain('### Second Decision');
  });
});
