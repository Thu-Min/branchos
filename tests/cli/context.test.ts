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
  RESEARCH_DIR,
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

  it('includes research summaries in context packet when complete research artifacts exist', async () => {
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

    // Create a complete research artifact
    const researchDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, RESEARCH_DIR);
    await mkdir(researchDir, { recursive: true });
    await writeFile(
      join(researchDir, 'R-001-auth-patterns.md'),
      [
        '---',
        'id: R-001',
        'topic: Auth Patterns',
        'status: complete',
        'date: 2026-03-01',
        'features: []',
        '---',
        '',
        '## Summary',
        '',
        'JWT with refresh rotation is the recommended approach.',
        '',
        '## Details',
        '',
        'More details here.',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler('discuss', { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.raw).toContain('Research');
    expect(result!.raw).toContain('JWT with refresh rotation');
  });

  it('produces no Research section when no research directory exists', async () => {
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

    // No research dir created

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler('discuss', { cwd: tempDir });

    expect(result).not.toBeNull();
    // Research section should not appear (null-skip pattern)
    expect(result!.raw).not.toContain('## Research');
  });

  it('filters out draft research artifacts from context packet', async () => {
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

    // Create a draft research artifact (should be excluded)
    const researchDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, RESEARCH_DIR);
    await mkdir(researchDir, { recursive: true });
    await writeFile(
      join(researchDir, 'R-001-wip-research.md'),
      [
        '---',
        'id: R-001',
        'topic: WIP Research',
        'status: draft',
        'date: 2026-03-01',
        'features: []',
        '---',
        '',
        '## Summary',
        '',
        'Draft findings not ready for use.',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler('discuss', { cwd: tempDir });

    expect(result).not.toBeNull();
    // Draft artifacts should not produce a Research section
    expect(result!.raw).not.toContain('## Research');
    expect(result!.raw).not.toContain('Draft findings');
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

describe('contextHandler GWT rendering', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-context-gwt-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('renders GWT acceptance criteria as structured checklist in context packet', async () => {
    initGitRepo(tempDir);
    const wsDir = await setupWorkstream(tempDir, 'gwt-ws', {
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

    // Link workstream to feature
    await writeFile(
      join(wsDir, 'meta.json'),
      JSON.stringify({
        branch: execSync('git branch --show-current', { cwd: tempDir }).toString().trim(),
        featureId: 'F-001',
      }),
    );

    // Create feature file with GWT acceptance criteria
    const featuresDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, 'features');
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      join(featuresDir, 'F-001-auth-login.md'),
      [
        '---',
        'id: F-001',
        'title: Auth Login',
        'status: in-progress',
        'milestone: M1',
        'branch: feature/auth-login',
        'issue: null',
        'workstream: null',
        '---',
        '',
        'User authentication via email and password.',
        '',
        '## Acceptance Criteria',
        '',
        '### AC-1',
        'Given a user with valid credentials',
        'When they submit the login form',
        'Then they receive a JWT token',
        '',
        '### AC-2',
        'Given a user with invalid credentials',
        'When they submit the login form',
        'Then they see an error message',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    // Should contain formatted checklist
    expect(result!.raw).toContain('- [ ] **AC-1**');
    expect(result!.raw).toContain('- [ ] **AC-2**');
    expect(result!.raw).toContain('Given a user with valid credentials');
    // Should preserve description text
    expect(result!.raw).toContain('User authentication via email and password.');
  });

  it('renders freeform-only feature body as-is (backward compatible)', async () => {
    initGitRepo(tempDir);
    const wsDir = await setupWorkstream(tempDir, 'freeform-ws', {
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

    await writeFile(
      join(wsDir, 'meta.json'),
      JSON.stringify({
        branch: execSync('git branch --show-current', { cwd: tempDir }).toString().trim(),
        featureId: 'F-002',
      }),
    );

    const featuresDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, 'features');
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      join(featuresDir, 'F-002-basic-feature.md'),
      [
        '---',
        'id: F-002',
        'title: Basic Feature',
        'status: unassigned',
        'milestone: M1',
        'branch: feature/basic',
        'issue: null',
        'workstream: null',
        '---',
        '',
        'This is a plain feature body with no acceptance criteria heading.',
        'It should render as-is.',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    // Body should pass through unchanged
    expect(result!.raw).toContain('This is a plain feature body with no acceptance criteria heading.');
    expect(result!.raw).toContain('It should render as-is.');
  });

  it('renders feature with empty body as header only', async () => {
    initGitRepo(tempDir);
    const wsDir = await setupWorkstream(tempDir, 'empty-ws', {
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

    await writeFile(
      join(wsDir, 'meta.json'),
      JSON.stringify({
        branch: execSync('git branch --show-current', { cwd: tempDir }).toString().trim(),
        featureId: 'F-003',
      }),
    );

    const featuresDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, 'features');
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      join(featuresDir, 'F-003-empty.md'),
      [
        '---',
        'id: F-003',
        'title: Empty Feature',
        'status: unassigned',
        'milestone: M1',
        'branch: feature/empty',
        'issue: null',
        'workstream: null',
        '---',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    expect(result!.raw).toContain('Empty Feature');
    // Should have the header table but no body content
    expect(result!.raw).toContain('| Feature | F-003 |');
  });

  it('renders mixed GWT + freeform items as unified checklist', async () => {
    initGitRepo(tempDir);
    const wsDir = await setupWorkstream(tempDir, 'mixed-ws', {
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

    await writeFile(
      join(wsDir, 'meta.json'),
      JSON.stringify({
        branch: execSync('git branch --show-current', { cwd: tempDir }).toString().trim(),
        featureId: 'F-004',
      }),
    );

    const featuresDir = join(tempDir, BRANCHOS_DIR, SHARED_DIR, 'features');
    await mkdir(featuresDir, { recursive: true });
    await writeFile(
      join(featuresDir, 'F-004-mixed.md'),
      [
        '---',
        'id: F-004',
        'title: Mixed Feature',
        'status: unassigned',
        'milestone: M1',
        'branch: feature/mixed',
        'issue: null',
        'workstream: null',
        '---',
        '',
        'A feature with mixed criteria.',
        '',
        '## Acceptance Criteria',
        '',
        '### AC-1',
        'Given a user is logged in',
        'When they click the button',
        'Then the action completes',
        '',
        '- [ ] Performance must be under 200ms',
      ].join('\n'),
    );

    const { contextHandler } = await import('../../src/cli/context.js');
    const result = await contextHandler(undefined, { cwd: tempDir });

    expect(result).not.toBeNull();
    // GWT block rendered as checklist
    expect(result!.raw).toContain('- [ ] **AC-1**');
    // Freeform item also present
    expect(result!.raw).toContain('- [ ] Performance must be under 200ms');
    // Description preserved
    expect(result!.raw).toContain('A feature with mixed criteria.');
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
