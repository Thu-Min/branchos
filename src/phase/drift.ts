import { readFile } from 'fs/promises';
import { join } from 'path';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PHASES_DIR } from '../constants.js';
import { GitOps } from '../git/index.js';
import { readState } from '../state/state.js';

export interface DriftResult {
  baseline: string;
  currentHead: string;
  planned: string[];
  actual: string[];
  plannedAndChanged: string[];
  plannedNotChanged: string[];
  changedNotPlanned: string[];
}

/**
 * Parse affected files from plan.md content.
 * Matches both "## Affected Files" and "### Affected Files" headings (case-insensitive).
 * Captures lines matching `- \`<path>\`` until the next ## heading.
 * Deduplicates across multiple sections.
 */
export function parseAffectedFiles(planContent: string): string[] {
  const lines = planContent.split('\n');
  const files = new Set<string>();
  let capturing = false;

  for (const line of lines) {
    // Check for ## or ### Affected Files heading (case-insensitive)
    if (/^#{2,3}\s+affected\s+files\s*$/i.test(line)) {
      capturing = true;
      continue;
    }

    // Stop capturing at next heading
    if (capturing && /^#{2,3}\s+/.test(line)) {
      capturing = false;
      continue;
    }

    // Capture file paths in backticks
    if (capturing) {
      const match = line.match(/^-\s+`([^`]+)`/);
      if (match) {
        files.add(match[1]);
      }
    }
  }

  return [...files];
}

/**
 * Categorize changes into three groups based on planned vs actual files.
 */
export function categorizeChanges(
  planned: string[],
  actual: string[],
): { plannedAndChanged: string[]; plannedNotChanged: string[]; changedNotPlanned: string[] } {
  const plannedSet = new Set(planned);
  const actualSet = new Set(actual);

  const plannedAndChanged = planned.filter((f) => actualSet.has(f));
  const plannedNotChanged = planned.filter((f) => !actualSet.has(f));
  const changedNotPlanned = actual.filter((f) => !plannedSet.has(f));

  return { plannedAndChanged, plannedNotChanged, changedNotPlanned };
}

/**
 * Run drift detection for a workstream phase.
 * Reads state.json for planBaseline, reads plan.md for affected files,
 * gets changed files from git, and categorizes them.
 */
export async function checkDrift(
  repoRoot: string,
  workstreamId: string,
  phaseNumber: number,
): Promise<DriftResult> {
  const wsDir = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR, workstreamId);
  const statePath = join(wsDir, 'state.json');
  const state = await readState(statePath);

  const phase = state.phases.find((p) => p.number === phaseNumber);
  if (!phase) {
    throw new Error(`Phase ${phaseNumber} not found in state`);
  }

  if (!phase.planBaseline) {
    throw new Error(`No plan baseline found for phase ${phaseNumber}. Run /plan-phase first.`);
  }

  const phaseDir = join(wsDir, PHASES_DIR, String(phaseNumber));
  let planContent: string;
  try {
    planContent = await readFile(join(phaseDir, 'plan.md'), 'utf-8');
  } catch {
    throw new Error(`No plan.md found for phase ${phaseNumber} at ${phaseDir}/plan.md`);
  }

  const planned = parseAffectedFiles(planContent);
  const git = new GitOps(repoRoot);
  const actual = await git.getChangedFiles(phase.planBaseline);
  const currentHead = await git.getHeadHash();

  const { plannedAndChanged, plannedNotChanged, changedNotPlanned } = categorizeChanges(planned, actual);

  return {
    baseline: phase.planBaseline,
    currentHead,
    planned,
    actual,
    plannedAndChanged,
    plannedNotChanged,
    changedNotPlanned,
  };
}
