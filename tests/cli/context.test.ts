import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { Command } from 'commander';
import {
  BRANCHOS_DIR,
  WORKSTREAMS_DIR,
  SHARED_DIR,
  CODEBASE_DIR,
  PHASES_DIR,
  DECISIONS_FILE,
} from '../../src/constants.js';

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  execSync('git commit --allow-empty -m "initial"', { cwd: dir, stdio: 'pipe' });
}

async function setupWorkstream(
  dir: string,
  wsId: string,
  state: Record<string, unknown>,
): Promise<string> {
  const wsDir = join(dir, BRANCHOS_DIR, WORKSTREAMS_DIR, wsId);
  await mkdir(wsDir, { recursive: true });
  const branch = execSync('git branch --show-current', { cwd: dir }).toString().trim();
  await writeFile(join(wsDir, 'meta.json'), JSON.stringify({ branch }));
  await writeFile(join(wsDir, 'state.json'), JSON.stringify(state));
  return wsDir;
}

describe('contextHandler', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-context-cli-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns null when no workstream found', async () => {
    initGitRepo(tempDir);

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });
    expect(result).toBeNull();
  });

  it('produces fallback context packet when no active phase', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'created',
      tasks: [],
      currentPhase: 0,
      phases: [],
    });

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.step).toBe('fallback');
  });

  it('auto-detects plan step when discuss is complete', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'complete' },
          plan: { status: 'not-started' },
          execute: { status: 'not-started' },
        },
      ],
    });

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.step).toBe('plan');
  });

  it('uses explicit step override', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'complete' },
          plan: { status: 'not-started' },
          execute: { status: 'not-started' },
        },
      ],
    });

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler('discuss', { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.step).toBe('discuss');
  });

  it('--json output contains expected structure', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'complete' },
          plan: { status: 'complete' },
          execute: { status: 'in-progress' },
        },
      ],
    });

    const { contextHandler } = await import('../../src/cli/context.js');

    const logCalls: unknown[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { logCalls.push(args[0]); };
    const result = await contextHandler(undefined, { cwd: tempDir, json: true });
    console.log = originalLog;

    expect(result).not.toBeNull();
    expect(result!.step).toBe('execute');
    expect(result!.header).toBeDefined();
    expect(result!.sections).toBeInstanceOf(Array);
    expect(result!.raw).toBeDefined();

    // Verify JSON was logged
    expect(logCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(logCalls[0] as string);
    expect(parsed).toHaveProperty('step');
    expect(parsed).toHaveProperty('header');
    expect(parsed).toHaveProperty('sections');
    expect(parsed).toHaveProperty('raw');
  });

  it('passes null for missing files to assembleContext', async () => {
    initGitRepo(tempDir);
    // No codebase map, no phase artifacts, no decisions
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'not-started' },
          plan: { status: 'not-started' },
          execute: { status: 'not-started' },
        },
      ],
    });

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    // Missing files should produce inline notes (from assembleContext behavior)
    expect(result!.raw).toContain('No codebase map found');
  });

  it('reads codebase map files when they exist', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'not-started' },
          plan: { status: 'not-started' },
          execute: { status: 'not-started' },
        },
      ],
    });

    // Create codebase map files
    const codebaseDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
    await mkdir(codebaseDir, { recursive: true });
    await writeFile(join(codebaseDir, 'ARCHITECTURE.md'), '# Architecture\nTest architecture content');
    await writeFile(join(codebaseDir, 'CONVENTIONS.md'), '# Conventions\nTest conventions content');

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.raw).toContain('Test architecture content');
    expect(result!.raw).toContain('Test conventions content');
  });

  it('reads decisions.md when it exists', async () => {
    initGitRepo(tempDir);
    const wsDir = await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'in-progress',
      tasks: [],
      currentPhase: 1,
      phases: [
        {
          number: 1,
          status: 'active',
          discuss: { status: 'not-started' },
          plan: { status: 'not-started' },
          execute: { status: 'not-started' },
        },
      ],
    });

    await writeFile(join(wsDir, DECISIONS_FILE), '# Decisions\n\nUsed TypeScript for type safety');

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.raw).toContain('Used TypeScript for type safety');
  });

  it('outputs raw markdown to stdout when --json is not set', async () => {
    initGitRepo(tempDir);
    await setupWorkstream(tempDir, 'test-ws', {
      schemaVersion: 2,
      status: 'created',
      tasks: [],
      currentPhase: 0,
      phases: [],
    });

    const { contextHandler } = await import('../../src/cli/context.js');

    const logCalls: unknown[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => { logCalls.push(args[0]); };
    await contextHandler(undefined, { cwd: tempDir });
    console.log = originalLog;

    expect(logCalls.length).toBeGreaterThan(0);
    const logged = logCalls[0] as string;
    // Should be raw markdown, not JSON
    expect(logged).toContain('## Context Packet');
  });
});

describe('registerContextCommand', () => {
  it('registers "context" command with optional step argument', async () => {
    const { registerContextCommand } = await import('../../src/cli/context.js');
    const program = new Command();
    registerContextCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'context');
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain('context');
  });
});
