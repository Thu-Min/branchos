import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { getCurrentPhase } from '../phase/index.js';
import { readState } from '../state/state.js';
import { ensureWorkstream } from '../workstream/prompt.js';
import { checkStaleness } from '../map/staleness.js';
import {
  assembleContext,
  detectStep,
  type AssemblyInput,
  type ContextPacket,
  type WorkflowStep,
} from '../context/assemble.js';
import { error } from '../output/index.js';
import { readMeta } from '../state/meta.js';
import { readAllFeatures } from '../roadmap/feature-file.js';
import type { Feature } from '../roadmap/types.js';
import {
  BRANCHOS_DIR,
  SHARED_DIR,
  CODEBASE_DIR,
  PHASES_DIR,
  DECISIONS_FILE,
  PROTECTED_BRANCHES,
} from '../constants.js';

export interface ContextOptions {
  json?: boolean;
  cwd?: string;
}

function formatFeatureContext(feature: Feature): string {
  const header = [
    '| Field | Value |',
    '|-------|-------|',
    `| Feature | ${feature.id} |`,
    `| Title | ${feature.title} |`,
    `| Status | ${feature.status} |`,
    `| Milestone | ${feature.milestone} |`,
    `| Branch | ${feature.branch} |`,
  ].join('\n');

  return feature.body ? `${header}\n\n${feature.body}` : header;
}

async function readFileOrNull(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function contextHandler(
  step: string | undefined,
  options: ContextOptions,
): Promise<ContextPacket | null> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();

  const workstream = await ensureWorkstream(repoRoot);
  if (!workstream) {
    if (options.json) {
      error('No workstream found for current branch.', { json: true });
    }
    return null;
  }

  // Load feature context if workstream is linked to a feature
  let featureContext: string | null = null;
  try {
    const metaPath = join(workstream.path, 'meta.json');
    const meta = await readMeta(metaPath);
    if (meta.featureId) {
      const featuresDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, 'features');
      const features = await readAllFeatures(featuresDir);
      const feature = features.find((f) => f.id === meta.featureId);
      if (feature) {
        featureContext = formatFeatureContext(feature);
      }
    }
  } catch {
    // Feature file missing/unreadable - proceed without feature context
  }

  const statePath = join(workstream.path, 'state.json');
  const state = await readState(statePath);
  const currentPhase = getCurrentPhase(state);

  // Determine workflow step
  let detectedStep: WorkflowStep;
  if (step) {
    const validSteps: WorkflowStep[] = ['discuss', 'plan', 'execute'];
    if (!validSteps.includes(step as WorkflowStep)) {
      error(`Invalid step "${step}". Must be one of: discuss, plan, execute.`, {
        json: options.json,
      });
      return null;
    }
    detectedStep = step as WorkflowStep;
  } else {
    detectedStep = detectStep(currentPhase);
  }

  const phaseNumber = currentPhase ? currentPhase.number : 0;

  // Determine diff baseline
  let baseline: string | null = null;
  if (currentPhase?.planBaseline) {
    baseline = currentPhase.planBaseline;
  } else {
    for (const branch of PROTECTED_BRANCHES) {
      const mergeBase = await git.getMergeBase(branch);
      if (mergeBase) {
        baseline = mergeBase;
        break;
      }
    }
  }

  // Read codebase map files
  const codebasePath = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
  const architecture = await readFileOrNull(join(codebasePath, 'ARCHITECTURE.md'));
  const conventions = await readFileOrNull(join(codebasePath, 'CONVENTIONS.md'));
  const modules = await readFileOrNull(join(codebasePath, 'MODULES.md'));

  // Read phase artifacts
  const phasePath = join(workstream.path, PHASES_DIR, String(phaseNumber));
  const discussMd = await readFileOrNull(join(phasePath, 'discuss.md'));
  const planMd = await readFileOrNull(join(phasePath, 'plan.md'));
  const executeMd = await readFileOrNull(join(phasePath, 'execute.md'));

  // Read decisions
  const decisions = await readFileOrNull(join(workstream.path, DECISIONS_FILE));

  // Get git diff output
  let branchDiffNameStatus: string | null = null;
  let branchDiffStat: string | null = null;
  if (baseline) {
    const nameStatus = await git.getDiffNameStatus(baseline);
    const stat = await git.getDiffStat(baseline);
    branchDiffNameStatus = nameStatus || null;
    branchDiffStat = stat || null;
  }

  // Check staleness
  const staleness = await checkStaleness(repoRoot);

  // Get current branch
  let branch: string;
  try {
    branch = await git.getCurrentBranch();
  } catch {
    branch = 'unknown';
  }

  // Build step statuses
  const stepStatuses = {
    discuss: currentPhase?.discuss.status ?? 'not-started',
    plan: currentPhase?.plan.status ?? 'not-started',
    execute: currentPhase?.execute.status ?? 'not-started',
  };

  // Build assembly input
  const input: AssemblyInput = {
    workstreamId: workstream.id,
    branch,
    phaseNumber,
    stepStatuses,
    detectedStep,
    staleness: {
      exists: staleness.exists,
      commitsBehind: staleness.commitsBehind,
      isStale: staleness.isStale,
    },
    architecture,
    conventions,
    modules,
    discussMd,
    planMd,
    executeMd,
    decisions,
    branchDiffNameStatus,
    branchDiffStat,
    featureContext,
    researchSummaries: null,
  };

  const packet = assembleContext(input);

  // Output
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          step: packet.step,
          header: packet.header,
          sections: packet.sections,
          raw: packet.raw,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(packet.raw);
  }

  return packet;
}

export function registerContextCommand(program: Command): void {
  program
    .command('context')
    .description('Assemble phase-appropriate context packet for current workstream')
    .argument('[step]', 'Workflow step: discuss, plan, or execute (auto-detected if omitted)')
    .option('--json', 'Output in JSON format', false)
    .action(async (step: string | undefined, opts: { json: boolean }) => {
      try {
        await contextHandler(step, { json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
