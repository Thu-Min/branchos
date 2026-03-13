import type { Phase } from '../state/state.js';

export type WorkflowStep = 'discuss' | 'plan' | 'execute' | 'fallback';

export interface ContextSection {
  name: string;
  content: string;
}

export interface ContextPacket {
  step: WorkflowStep;
  header: string;
  sections: ContextSection[];
  raw: string;
}

export interface AssemblyInput {
  workstreamId: string;
  branch: string;
  phaseNumber: number;
  stepStatuses: { discuss: string; plan: string; execute: string };
  detectedStep: WorkflowStep;
  staleness: { exists: boolean; commitsBehind: number; isStale: boolean };
  architecture: string | null;
  conventions: string | null;
  modules: string | null;
  discussMd: string | null;
  planMd: string | null;
  executeMd: string | null;
  decisions: string | null;
  branchDiffNameStatus: string | null;
  branchDiffStat: string | null;
  featureContext: string | null;
  issueContext: string | null;
  researchSummaries: string | null;
}

const STEP_SECTIONS: Record<WorkflowStep, string[]> = {
  discuss: ['featureContext', 'issueContext', 'researchSummaries', 'architecture', 'conventions', 'decisions', 'branchDiff'],
  plan: ['featureContext', 'issueContext', 'researchSummaries', 'discuss', 'modules', 'conventions', 'decisions', 'branchDiff'],
  execute: ['featureContext', 'issueContext', 'plan', 'execute', 'branchDiff', 'decisions'],
  fallback: ['featureContext', 'issueContext', 'architecture', 'conventions', 'decisions', 'branchDiff', 'hint'],
};

export function detectStep(phase: Phase | null): WorkflowStep {
  if (!phase) return 'fallback';
  if (phase.execute.status === 'in-progress' || phase.execute.status === 'complete') {
    return 'execute';
  }
  if (phase.plan.status === 'complete') {
    return 'execute';
  }
  if (phase.discuss.status === 'complete') {
    return 'plan';
  }
  return 'discuss';
}

function buildHeader(input: AssemblyInput): string {
  const { workstreamId, branch, phaseNumber, stepStatuses, staleness, detectedStep } = input;

  let header = `## Context Packet\n\n`;
  header += `| Field | Value |\n|-------|-------|\n`;
  header += `| Workstream | ${workstreamId} |\n`;
  header += `| Branch | ${branch} |\n`;
  header += `| Phase | ${phaseNumber} |\n`;
  header += `| Step | ${detectedStep} |\n`;
  header += `| Discuss | ${stepStatuses.discuss} |\n`;
  header += `| Plan | ${stepStatuses.plan} |\n`;
  header += `| Execute | ${stepStatuses.execute} |\n`;

  if (staleness.exists) {
    header += `| Map freshness | ${staleness.commitsBehind} commits behind HEAD |\n`;
    if (staleness.isStale) {
      header += `\n> **Warning:** Codebase map is stale (${staleness.commitsBehind} commits behind). Run /map-codebase to refresh.\n`;
    }
  } else {
    header += `| Map freshness | No codebase map found |\n`;
    header += `\n> **Note:** No codebase map found. Run /map-codebase to generate one.\n`;
  }

  return header;
}

function buildSection(name: string, content: string | null, missingNote: string): ContextSection {
  if (content !== null) {
    return { name, content };
  }
  return { name, content: `> ${missingNote}` };
}

function buildBranchDiffSection(nameStatus: string | null, stat: string | null): ContextSection {
  let content = '';

  if (nameStatus === null && stat === null) {
    content = '> No branch diff available.';
  } else {
    if (nameStatus) {
      content += '```\n' + nameStatus + '\n```\n';
    }
    if (stat) {
      content += '\n```\n' + stat + '\n```';
    }
  }

  return { name: 'Branch Diff', content: content.trim() };
}

function getSection(key: string, input: AssemblyInput): ContextSection {
  switch (key) {
    case 'featureContext':
      return buildSection('Feature Context', input.featureContext, '');
    case 'issueContext':
      return buildSection('Issue Context', input.issueContext, '');
    case 'researchSummaries':
      return buildSection('Research', input.researchSummaries, 'No research findings available.');
    case 'architecture':
      return buildSection(
        'Architecture',
        input.architecture,
        'No codebase map found. Run /map-codebase to generate one.',
      );
    case 'conventions':
      return buildSection(
        'Conventions',
        input.conventions,
        'No codebase map found. Run /map-codebase to generate one.',
      );
    case 'modules':
      return buildSection(
        'Modules',
        input.modules,
        'No codebase map found. Run /map-codebase to generate one.',
      );
    case 'discuss':
      return buildSection(
        'Discussion',
        input.discussMd,
        'No discuss.md found for this phase.',
      );
    case 'plan':
      return buildSection(
        'Plan',
        input.planMd,
        'No plan.md found for this phase.',
      );
    case 'execute':
      return buildSection(
        'Execution',
        input.executeMd,
        'No execute.md found for this phase.',
      );
    case 'decisions':
      return buildSection(
        'Decisions',
        input.decisions,
        'No decisions recorded yet.',
      );
    case 'branchDiff':
      return buildBranchDiffSection(input.branchDiffNameStatus, input.branchDiffStat);
    case 'hint':
      return {
        name: 'Next Steps',
        content: 'No active phase detected. Run /discuss-phase to start a new phase discussion.',
      };
    default:
      return { name: key, content: '' };
  }
}

export function assembleContext(input: AssemblyInput): ContextPacket {
  const header = buildHeader(input);
  const sectionKeys = STEP_SECTIONS[input.detectedStep];
  const sections: ContextSection[] = [];

  for (const key of sectionKeys) {
    if (key === 'featureContext' && !input.featureContext) continue;
    if (key === 'issueContext' && !input.issueContext) continue;
    if (key === 'researchSummaries' && !input.researchSummaries) continue;
    sections.push(getSection(key, input));
  }

  let raw = header + '\n';
  for (const section of sections) {
    raw += `\n## ${section.name}\n\n${section.content}\n`;
  }

  return {
    step: input.detectedStep,
    header,
    sections,
    raw,
  };
}
