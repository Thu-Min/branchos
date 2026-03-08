import { mkdir } from 'fs/promises';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PHASES_DIR } from '../constants.js';
import { GitOps } from '../git/index.js';
import { discoverWorkstreams } from '../workstream/discover.js';
import type { WorkstreamState, Phase, PhaseStep } from '../state/state.js';

export function createPhase(state: WorkstreamState): WorkstreamState {
  const newNumber = state.phases.length + 1;
  const newPhase: Phase = {
    number: newNumber,
    status: 'active',
    discuss: { status: 'not-started' },
    plan: { status: 'not-started' },
    execute: { status: 'not-started' },
  };
  return {
    ...state,
    currentPhase: newNumber,
    phases: [...state.phases, newPhase],
  };
}

export function getCurrentPhase(state: WorkstreamState): Phase | null {
  if (state.currentPhase === 0) {
    return null;
  }
  return state.phases.find((p) => p.number === state.currentPhase) ?? null;
}

export function updatePhaseStep(
  state: WorkstreamState,
  phaseNumber: number,
  step: 'discuss' | 'plan' | 'execute',
  updates: Partial<PhaseStep> & { planBaseline?: string },
): WorkstreamState {
  const now = new Date().toISOString();
  const newPhases = state.phases.map((phase) => {
    if (phase.number !== phaseNumber) {
      return phase;
    }
    const { planBaseline, ...stepUpdates } = updates;
    const updatedStep: PhaseStep = {
      ...phase[step],
      ...stepUpdates,
      updatedAt: now,
    };
    const updatedPhase: Phase = {
      ...phase,
      [step]: updatedStep,
    };
    if (step === 'plan' && planBaseline !== undefined) {
      updatedPhase.planBaseline = planBaseline;
    }
    return updatedPhase;
  });
  return {
    ...state,
    phases: newPhases,
  };
}

export async function ensurePhaseDir(
  repoRoot: string,
  workstreamId: string,
  phaseNumber: number,
): Promise<string> {
  const dir = join(
    repoRoot,
    BRANCHOS_DIR,
    WORKSTREAMS_DIR,
    workstreamId,
    PHASES_DIR,
    String(phaseNumber),
  );
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function resolveCurrentWorkstream(
  repoRoot: string,
): Promise<{ id: string; path: string } | null> {
  const git = new GitOps(repoRoot);
  let branch: string;
  try {
    branch = await git.getCurrentBranch();
  } catch {
    return null;
  }

  const workstreamsDir = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR);
  const ids = await discoverWorkstreams(workstreamsDir);

  for (const id of ids) {
    const metaPath = join(workstreamsDir, id, 'meta.json');
    try {
      const raw = await readFile(metaPath, 'utf-8');
      const meta = JSON.parse(raw) as { branch?: string };
      if (meta.branch === branch) {
        return { id, path: join(workstreamsDir, id) };
      }
    } catch {
      // Skip unreadable meta files
    }
  }

  return null;
}
