import { describe, it, expect } from 'vitest';
import {
  detectStep,
  assembleContext,
  type AssemblyInput,
  type WorkflowStep,
} from '../../src/context/assemble.js';
import type { Phase } from '../../src/state/state.js';

function makePhase(overrides: Partial<Phase> = {}): Phase {
  return {
    number: 1,
    status: 'active',
    discuss: { status: 'not-started' },
    plan: { status: 'not-started' },
    execute: { status: 'not-started' },
    ...overrides,
  };
}

function makeInput(overrides: Partial<AssemblyInput> = {}): AssemblyInput {
  return {
    workstreamId: 'ws-test',
    branch: 'feature/test',
    phaseNumber: 1,
    stepStatuses: { discuss: 'not-started', plan: 'not-started', execute: 'not-started' },
    detectedStep: 'discuss',
    staleness: { exists: true, commitsBehind: 0, isStale: false },
    architecture: '# Architecture\nSome architecture content',
    conventions: '# Conventions\nSome conventions content',
    modules: '# Modules\nSome modules content',
    discussMd: '# Discuss\nSome discuss content',
    planMd: '# Plan\nSome plan content',
    executeMd: '# Execute\nSome execute content',
    decisions: '# Decisions\nSome decisions content',
    branchDiffNameStatus: 'M\tsrc/foo.ts\nA\tsrc/bar.ts',
    branchDiffStat: ' src/foo.ts | 10 +++++-----\n src/bar.ts |  5 +++++\n 2 files changed, 10 insertions(+), 5 deletions(-)',
    ...overrides,
  };
}

describe('detectStep', () => {
  it('returns fallback when phase is null', () => {
    expect(detectStep(null)).toBe('fallback');
  });

  it('returns execute when execute is in-progress', () => {
    const phase = makePhase({ execute: { status: 'in-progress' } });
    expect(detectStep(phase)).toBe('execute');
  });

  it('returns execute when execute is complete', () => {
    const phase = makePhase({ execute: { status: 'complete' } });
    expect(detectStep(phase)).toBe('execute');
  });

  it('returns execute when plan is complete and execute is not-started', () => {
    const phase = makePhase({
      discuss: { status: 'complete' },
      plan: { status: 'complete' },
      execute: { status: 'not-started' },
    });
    expect(detectStep(phase)).toBe('execute');
  });

  it('returns plan when discuss is complete and plan is not-started', () => {
    const phase = makePhase({
      discuss: { status: 'complete' },
      plan: { status: 'not-started' },
    });
    expect(detectStep(phase)).toBe('plan');
  });

  it('returns discuss when discuss is not-started', () => {
    const phase = makePhase({ discuss: { status: 'not-started' } });
    expect(detectStep(phase)).toBe('discuss');
  });

  it('returns discuss when discuss is in-progress', () => {
    const phase = makePhase({ discuss: { status: 'in-progress' } });
    expect(detectStep(phase)).toBe('discuss');
  });
});

describe('assembleContext', () => {
  describe('discuss step', () => {
    it('includes header, architecture, conventions, decisions, and branch diff', () => {
      const input = makeInput({ detectedStep: 'discuss' });
      const result = assembleContext(input);

      expect(result.step).toBe('discuss');
      expect(result.raw).toContain('Architecture');
      expect(result.raw).toContain('Some architecture content');
      expect(result.raw).toContain('Conventions');
      expect(result.raw).toContain('Some conventions content');
      expect(result.raw).toContain('Decisions');
      expect(result.raw).toContain('Some decisions content');
      expect(result.raw).toContain('Branch Diff');
      expect(result.raw).toContain('src/foo.ts');
    });

    it('does NOT include MODULES.md content', () => {
      const input = makeInput({ detectedStep: 'discuss' });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('Some modules content');
    });
  });

  describe('plan step', () => {
    it('includes header, discuss.md, modules, conventions, decisions, and branch diff', () => {
      const input = makeInput({ detectedStep: 'plan' });
      const result = assembleContext(input);

      expect(result.step).toBe('plan');
      expect(result.raw).toContain('Some discuss content');
      expect(result.raw).toContain('Some modules content');
      expect(result.raw).toContain('Some conventions content');
      expect(result.raw).toContain('Some decisions content');
      expect(result.raw).toContain('Branch Diff');
    });

    it('does NOT include ARCHITECTURE.md content', () => {
      const input = makeInput({ detectedStep: 'plan' });
      const result = assembleContext(input);

      // Check that architecture section is not present
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Architecture');
    });
  });

  describe('execute step', () => {
    it('includes header, plan.md, execute.md, branch diff, and decisions', () => {
      const input = makeInput({ detectedStep: 'execute' });
      const result = assembleContext(input);

      expect(result.step).toBe('execute');
      expect(result.raw).toContain('Some plan content');
      expect(result.raw).toContain('Some execute content');
      expect(result.raw).toContain('Branch Diff');
      expect(result.raw).toContain('Some decisions content');
    });

    it('does NOT include ARCHITECTURE.md or MODULES.md', () => {
      const input = makeInput({ detectedStep: 'execute' });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Architecture');
      expect(sectionNames).not.toContain('Modules');
    });
  });

  describe('fallback step', () => {
    it('includes header, architecture, conventions, decisions, branch diff, and hint', () => {
      const input = makeInput({ detectedStep: 'fallback' });
      const result = assembleContext(input);

      expect(result.step).toBe('fallback');
      expect(result.raw).toContain('Some architecture content');
      expect(result.raw).toContain('Some conventions content');
      expect(result.raw).toContain('Some decisions content');
      expect(result.raw).toContain('Branch Diff');
      expect(result.raw).toContain('/discuss-phase');
    });
  });

  describe('missing files', () => {
    it('handles null files gracefully with inline notes', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        architecture: null,
        conventions: null,
        decisions: null,
        branchDiffNameStatus: null,
        branchDiffStat: null,
      });

      // Should not throw
      const result = assembleContext(input);
      expect(result.raw).toBeDefined();
      expect(result.raw.length).toBeGreaterThan(0);
    });

    it('includes note when architecture is missing', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        architecture: null,
      });
      const result = assembleContext(input);
      expect(result.raw).toContain('No codebase map found');
    });

    it('includes note when decisions is missing', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        decisions: null,
      });
      const result = assembleContext(input);
      expect(result.raw).toContain('No decisions');
    });
  });

  describe('header', () => {
    it('includes workstream ID, branch, phase number, step statuses, and detected step', () => {
      const input = makeInput({
        workstreamId: 'ws-abc',
        branch: 'feature/abc',
        phaseNumber: 3,
        stepStatuses: { discuss: 'complete', plan: 'in-progress', execute: 'not-started' },
        detectedStep: 'plan',
      });
      const result = assembleContext(input);

      expect(result.header).toContain('ws-abc');
      expect(result.header).toContain('feature/abc');
      expect(result.header).toContain('3');
      expect(result.header).toContain('plan');
      expect(result.header).toContain('complete');
      expect(result.header).toContain('in-progress');
      expect(result.header).toContain('not-started');
    });

    it('includes staleness warning when map is stale', () => {
      const input = makeInput({
        staleness: { exists: true, commitsBehind: 5, isStale: true },
      });
      const result = assembleContext(input);

      expect(result.header).toContain('stale');
      expect(result.header).toContain('5');
    });

    it('shows no codebase map note when map does not exist', () => {
      const input = makeInput({
        staleness: { exists: false, commitsBehind: 0, isStale: false },
      });
      const result = assembleContext(input);

      expect(result.header).toContain('No codebase map found');
    });
  });

  describe('branch diff section', () => {
    it('combines both name-status and stat output', () => {
      const input = makeInput({ detectedStep: 'discuss' });
      const result = assembleContext(input);

      expect(result.raw).toContain('M\tsrc/foo.ts');
      expect(result.raw).toContain('2 files changed');
    });
  });

  describe('sections array', () => {
    it('returns sections with name and content', () => {
      const input = makeInput({ detectedStep: 'discuss' });
      const result = assembleContext(input);

      expect(result.sections.length).toBeGreaterThan(0);
      for (const section of result.sections) {
        expect(section.name).toBeDefined();
        expect(section.content).toBeDefined();
      }
    });
  });
});
