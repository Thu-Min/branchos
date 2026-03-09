import { join } from 'path';
import chalk from 'chalk';
import { GitOps } from '../git/index.js';
import { discoverWorkstreams } from './discover.js';
import { readMeta } from '../state/meta.js';
import { readState, Phase } from '../state/state.js';
import { BRANCHOS_DIR, WORKSTREAMS_DIR } from '../constants.js';

export interface StatusRow {
  id: string;
  branch: string;
  phase: string;
  lastActivity: string;
  status: string;
}

export interface StatusResult {
  rows: StatusRow[];
  currentBranch: string;
}

function getPhaseDisplay(phases: Phase[], currentPhase: number): string {
  if (phases.length === 0) {
    return 'No phases';
  }

  const phase = phases.find((p) => p.number === currentPhase) ?? phases[phases.length - 1];
  const steps: Array<{ name: string; status: string }> = [
    { name: 'discuss', status: phase.discuss.status },
    { name: 'plan', status: phase.plan.status },
    { name: 'execute', status: phase.execute.status },
  ];

  const inProgress = steps.find((s) => s.status === 'in-progress');
  const step = inProgress ? inProgress.name : 'discuss';

  return `Phase ${phase.number} / ${step}`;
}

export async function statusHandler(options: {
  all?: boolean;
  json?: boolean;
  repoRoot?: string;
}): Promise<StatusResult | null> {
  const git = new GitOps(options.repoRoot);
  const repoRoot = options.repoRoot ?? (await git.getRepoRoot());
  const currentBranch = await git.getCurrentBranch();
  const workstreamsDir = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR);

  const ids = await discoverWorkstreams(workstreamsDir);

  if (ids.length === 0) {
    if (!options.json) {
      console.log('No active workstreams.');
    }
    return null;
  }

  const rows: StatusRow[] = [];

  for (const id of ids) {
    const wsPath = join(workstreamsDir, id);
    const meta = await readMeta(join(wsPath, 'meta.json'));

    if (!options.all && meta.status === 'archived') {
      continue;
    }

    let phaseDisplay: string;
    try {
      const state = await readState(join(wsPath, 'state.json'));
      phaseDisplay = getPhaseDisplay(state.phases, state.currentPhase);
    } catch {
      phaseDisplay = 'No phases';
    }

    rows.push({
      id: meta.workstreamId || id,
      branch: meta.branch,
      phase: phaseDisplay,
      lastActivity: meta.updatedAt,
      status: meta.status,
    });
  }

  if (rows.length === 0 && !options.all) {
    if (!options.json) {
      console.log('No active workstreams.');
    }
    return null;
  }

  const result: StatusResult = { rows, currentBranch };

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const header = [
      ''.padEnd(2),
      'Workstream'.padEnd(24),
      'Branch'.padEnd(30),
      'Phase'.padEnd(20),
      'Last Activity'.padEnd(24),
      'Status',
    ].join('');

    console.log(chalk.bold(header));

    for (const row of rows) {
      const marker = row.branch === currentBranch ? '\u25b6 ' : '  ';
      const line = [
        marker,
        row.id.padEnd(24),
        row.branch.padEnd(30),
        row.phase.padEnd(20),
        row.lastActivity.padEnd(24),
        row.status,
      ].join('');
      console.log(line);
    }
  }

  return result;
}
