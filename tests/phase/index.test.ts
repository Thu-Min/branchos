import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { WorkstreamState } from '../../src/state/state.js';

// We'll import actual functions once they exist
import {
  createPhase,
  getCurrentPhase,
  updatePhaseStep,
  ensurePhaseDir,
  resolveCurrentWorkstream,
} from '../../src/phase/index.js';

function makeEmptyState(): WorkstreamState {
  return {
    schemaVersion: 2,
    status: 'created',
    tasks: [],
    currentPhase: 0,
    phases: [],
  };
}

describe('createPhase', () => {
  it('creates phase 1 on empty phases array', () => {
    const state = makeEmptyState();
    const result = createPhase(state);
    expect(result.phases).toHaveLength(1);
    expect(result.phases[0].number).toBe(1);
    expect(result.currentPhase).toBe(1);
  });

  it('creates phase 2 when state already has phase 1', () => {
    const state = makeEmptyState();
    const withPhase1 = createPhase(state);
    const withPhase2 = createPhase(withPhase1);
    expect(withPhase2.phases).toHaveLength(2);
    expect(withPhase2.phases[1].number).toBe(2);
    expect(withPhase2.currentPhase).toBe(2);
  });

  it('new phase has status active and all steps not-started', () => {
    const state = makeEmptyState();
    const result = createPhase(state);
    const phase = result.phases[0];
    expect(phase.status).toBe('active');
    expect(phase.discuss.status).toBe('not-started');
    expect(phase.plan.status).toBe('not-started');
    expect(phase.execute.status).toBe('not-started');
  });

  it('does not mutate input state', () => {
    const state = makeEmptyState();
    const result = createPhase(state);
    expect(state.phases).toHaveLength(0);
    expect(state.currentPhase).toBe(0);
    expect(result).not.toBe(state);
  });
});

describe('getCurrentPhase', () => {
  it('returns null when currentPhase is 0', () => {
    const state = makeEmptyState();
    expect(getCurrentPhase(state)).toBeNull();
  });

  it('returns the phase matching currentPhase number', () => {
    const state = makeEmptyState();
    const withPhase = createPhase(state);
    const current = getCurrentPhase(withPhase);
    expect(current).not.toBeNull();
    expect(current!.number).toBe(1);
  });
});

describe('updatePhaseStep', () => {
  it('updates discuss step status and timestamps', () => {
    const state = createPhase(makeEmptyState());
    const result = updatePhaseStep(state, 1, 'discuss', { status: 'in-progress' });
    expect(result.phases[0].discuss.status).toBe('in-progress');
    expect(result.phases[0].discuss.updatedAt).toBeDefined();
  });

  it('updates plan step and stores planBaseline hash', () => {
    const state = createPhase(makeEmptyState());
    const result = updatePhaseStep(state, 1, 'plan', {
      status: 'complete',
      planBaseline: 'abc123',
    });
    expect(result.phases[0].plan.status).toBe('complete');
    expect(result.phases[0].planBaseline).toBe('abc123');
  });

  it('updates execute step status', () => {
    const state = createPhase(makeEmptyState());
    const result = updatePhaseStep(state, 1, 'execute', { status: 'in-progress' });
    expect(result.phases[0].execute.status).toBe('in-progress');
  });

  it('does not mutate input state', () => {
    const state = createPhase(makeEmptyState());
    const result = updatePhaseStep(state, 1, 'discuss', { status: 'in-progress' });
    expect(state.phases[0].discuss.status).toBe('not-started');
    expect(result).not.toBe(state);
  });
});

describe('ensurePhaseDir', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-phase-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates nested directory structure', async () => {
    const dir = await ensurePhaseDir(tempDir, 'my-workstream', 1);
    const s = await stat(dir);
    expect(s.isDirectory()).toBe(true);
    expect(dir).toContain('my-workstream');
    expect(dir).toContain('phases');
  });
});

describe('resolveCurrentWorkstream', () => {
  it('returns null when no workstream matches current branch', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'branchos-resolve-test-'));
    try {
      // Mock GitOps - we'll test with a non-matching setup
      const result = await resolveCurrentWorkstream(tempDir);
      expect(result).toBeNull();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
