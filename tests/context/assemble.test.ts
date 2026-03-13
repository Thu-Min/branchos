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
    featureContext: null,
    issueContext: null,
    researchSummaries: null,
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

  describe('featureContext', () => {
    it('produces NO Feature Context section when featureContext is null', () => {
      const input = makeInput({ detectedStep: 'discuss', featureContext: null });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('Feature Context');
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Feature Context');
    });

    it('produces Feature Context section when featureContext is provided', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        featureContext: '## Acceptance Criteria\n- works',
      });
      const result = assembleContext(input);

      expect(result.raw).toContain('Feature Context');
      expect(result.raw).toContain('## Acceptance Criteria');
      expect(result.raw).toContain('- works');
    });

    it('Feature Context section appears FIRST in sections for discuss step', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        featureContext: 'Feature body content',
      });
      const result = assembleContext(input);

      expect(result.sections[0].name).toBe('Feature Context');
      expect(result.sections[0].content).toBe('Feature body content');
    });

    it('Feature Context section appears FIRST in sections for plan step', () => {
      const input = makeInput({
        detectedStep: 'plan',
        featureContext: 'Feature body content',
      });
      const result = assembleContext(input);

      expect(result.sections[0].name).toBe('Feature Context');
    });

    it('Feature Context section appears FIRST in sections for execute step', () => {
      const input = makeInput({
        detectedStep: 'execute',
        featureContext: 'Feature body content',
      });
      const result = assembleContext(input);

      expect(result.sections[0].name).toBe('Feature Context');
    });

    it('Feature Context section appears FIRST in sections for fallback step', () => {
      const input = makeInput({
        detectedStep: 'fallback',
        featureContext: 'Feature body content',
      });
      const result = assembleContext(input);

      expect(result.sections[0].name).toBe('Feature Context');
    });

    it('non-feature workstreams produce identical output as before', () => {
      const input = makeInput({ detectedStep: 'discuss', featureContext: null });
      const result = assembleContext(input);

      // Should have exactly the same sections as before: architecture, conventions, decisions, branchDiff
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).toEqual(['Architecture', 'Conventions', 'Decisions', 'Branch Diff']);
    });
  });

  describe('researchSummaries', () => {
    it('produces NO Research section when researchSummaries is null', () => {
      const input = makeInput({ detectedStep: 'discuss', researchSummaries: null });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('## Research');
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Research');
    });

    it('produces Research section when researchSummaries is provided and step is discuss', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        researchSummaries: '## Topic A\nFindings about topic A',
      });
      const result = assembleContext(input);

      expect(result.raw).toContain('## Research');
      expect(result.raw).toContain('Findings about topic A');
    });

    it('produces Research section when researchSummaries is provided and step is plan', () => {
      const input = makeInput({
        detectedStep: 'plan',
        researchSummaries: '## Topic B\nFindings about topic B',
      });
      const result = assembleContext(input);

      expect(result.raw).toContain('## Research');
      expect(result.raw).toContain('Findings about topic B');
    });

    it('does NOT produce Research section when step is execute', () => {
      const input = makeInput({
        detectedStep: 'execute',
        researchSummaries: '## Topic C\nFindings about topic C',
      });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('## Research');
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Research');
    });

    it('does NOT produce Research section when step is fallback', () => {
      const input = makeInput({
        detectedStep: 'fallback',
        researchSummaries: '## Topic D\nFindings about topic D',
      });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('## Research');
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Research');
    });

    it('Research section appears AFTER featureContext and BEFORE architecture in discuss step', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        featureContext: 'Feature body content',
        researchSummaries: 'Research findings',
      });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames[0]).toBe('Feature Context');
      expect(sectionNames[1]).toBe('Research');
      expect(sectionNames[2]).toBe('Architecture');
    });

    it('Research section appears AFTER featureContext and BEFORE discuss in plan step', () => {
      const input = makeInput({
        detectedStep: 'plan',
        featureContext: 'Feature body content',
        researchSummaries: 'Research findings',
      });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames[0]).toBe('Feature Context');
      expect(sectionNames[1]).toBe('Research');
      expect(sectionNames[2]).toBe('Discussion');
    });

    it('non-research workstreams produce identical output (null researchSummaries skipped)', () => {
      const input = makeInput({ detectedStep: 'discuss', featureContext: null, researchSummaries: null });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).toEqual(['Architecture', 'Conventions', 'Decisions', 'Branch Diff']);
    });
  });

  describe('issueContext', () => {
    it('produces NO Issue Context section when issueContext is null', () => {
      const input = makeInput({ detectedStep: 'discuss', issueContext: null });
      const result = assembleContext(input);

      expect(result.raw).not.toContain('Issue Context');
      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).not.toContain('Issue Context');
    });

    it('produces Issue Context section when issueContext is provided', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        issueContext: '## Issue: Fix auth timeout [bug, priority:high]\n\nWhen users have slow connections...',
      });
      const result = assembleContext(input);

      expect(result.raw).toContain('Issue Context');
      expect(result.raw).toContain('Fix auth timeout');
      expect(result.raw).toContain('When users have slow connections');
    });

    it('Issue Context section appears AFTER featureContext in discuss step', () => {
      const input = makeInput({
        detectedStep: 'discuss',
        featureContext: 'Feature body content',
        issueContext: '## Issue: Fix auth timeout\n\nBody',
      });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames[0]).toBe('Feature Context');
      expect(sectionNames[1]).toBe('Issue Context');
    });

    it('Issue Context section appears in all steps when provided', () => {
      for (const step of ['discuss', 'plan', 'execute', 'fallback'] as const) {
        const input = makeInput({
          detectedStep: step,
          issueContext: '## Issue: Test\n\nBody',
        });
        const result = assembleContext(input);

        const sectionNames = result.sections.map((s) => s.name);
        expect(sectionNames).toContain('Issue Context');
      }
    });

    it('non-issue workstreams produce identical output (null issueContext skipped)', () => {
      const input = makeInput({ detectedStep: 'discuss', featureContext: null, issueContext: null, researchSummaries: null });
      const result = assembleContext(input);

      const sectionNames = result.sections.map((s) => s.name);
      expect(sectionNames).toEqual(['Architecture', 'Conventions', 'Decisions', 'Branch Diff']);
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
