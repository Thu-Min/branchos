import { Command } from 'commander';
import chalk from 'chalk';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { getCurrentPhase } from '../phase/index.js';
import { readState } from '../state/state.js';
import { checkDrift, DriftResult } from '../phase/drift.js';
import { output, error } from '../output/index.js';
import { ensureWorkstream } from '../workstream/prompt.js';

export interface CheckDriftOptions {
  json?: boolean;
  cwd?: string;
  phaseNumber?: number;
}

export async function checkDriftHandler(
  options: CheckDriftOptions,
): Promise<DriftResult | null> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();

  const workstream = await ensureWorkstream(repoRoot);
  if (!workstream) {
    if (options.json) {
      error('No workstream found for current branch.', { json: true });
    }
    return null;
  }

  const statePath = join(workstream.path, 'state.json');
  const state = await readState(statePath);
  const currentPhase = getCurrentPhase(state);

  const phaseNumber = options.phaseNumber ?? (currentPhase ? currentPhase.number : 0);
  if (phaseNumber === 0) {
    error('No active phase found. Create a phase first.', { json: options.json });
    return null;
  }

  const phase = state.phases.find((p) => p.number === phaseNumber);
  if (!phase) {
    error(`Phase ${phaseNumber} not found.`, { json: options.json });
    return null;
  }

  if (!phase.planBaseline) {
    error(`No plan baseline found for phase ${phaseNumber}. Run /plan-phase first.`, {
      json: options.json,
    });
    return null;
  }

  const result = await checkDrift(repoRoot, workstream.id, phaseNumber);

  if (options.json) {
    output(result as unknown as Record<string, unknown>, { json: true });
  } else {
    console.log(chalk.bold(`Drift Report - Phase ${phaseNumber}`));
    console.log(chalk.dim(`Baseline: ${result.baseline}`));
    console.log();

    console.log(chalk.green('Planned & Changed (on track):'));
    if (result.plannedAndChanged.length === 0) {
      console.log(chalk.dim('  (none)'));
    } else {
      for (const f of result.plannedAndChanged) {
        console.log(chalk.green(`  ${f}`));
      }
    }
    console.log();

    console.log(chalk.yellow('Planned but Not Changed (incomplete):'));
    if (result.plannedNotChanged.length === 0) {
      console.log(chalk.dim('  (none)'));
    } else {
      for (const f of result.plannedNotChanged) {
        console.log(chalk.yellow(`  ${f}`));
      }
    }
    console.log();

    console.log(chalk.cyan('Changed but Not Planned (unplanned):'));
    if (result.changedNotPlanned.length === 0) {
      console.log(chalk.dim('  (none)'));
    } else {
      for (const f of result.changedNotPlanned) {
        console.log(chalk.cyan(`  ${f}`));
      }
    }
    console.log();

    const { planned, actual, plannedAndChanged, plannedNotChanged, changedNotPlanned } = result;
    console.log(
      `${planned.length} planned, ${actual.length} changed, ` +
        `${plannedAndChanged.length} on track, ${plannedNotChanged.length} incomplete, ` +
        `${changedNotPlanned.length} unplanned`,
    );
  }

  return result;
}

export function registerCheckDriftCommand(program: Command): void {
  program
    .command('check-drift')
    .description('Compare planned work against actual git commits to detect drift')
    .option('--json', 'Output in JSON format', false)
    .option('--phase <number>', 'Target phase number')
    .action(async (opts: { json: boolean; phase?: string }) => {
      try {
        const phaseNumber = opts.phase ? parseInt(opts.phase, 10) : undefined;
        await checkDriftHandler({ json: opts.json, phaseNumber });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
