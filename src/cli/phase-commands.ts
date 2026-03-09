import { Command } from 'commander';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { resolveCurrentWorkstream, getCurrentPhase } from '../phase/index.js';
import { readState } from '../state/state.js';
import { output, error } from '../output/index.js';
import { ensureWorkstream } from '../workstream/prompt.js';

export interface PhaseCommandOptions {
  json?: boolean;
  cwd?: string;
}

export interface PhaseCommandResult {
  workstreamId: string;
  targetPhase: number;
  command: string;
  currentPhaseState: {
    discuss: string;
    plan: string;
    execute: string;
  } | null;
}

async function resolvePhaseContext(
  phaseNumber: string | undefined,
  options: PhaseCommandOptions,
): Promise<PhaseCommandResult & { error?: string }> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();
  const ws = await ensureWorkstream(repoRoot);

  if (!ws) {
    return {
      workstreamId: '',
      targetPhase: 0,
      command: '',
      currentPhaseState: null,
      error: 'no-workstream',
    };
  }

  const statePath = join(ws.path, 'state.json');
  const state = await readState(statePath);

  let target: number;
  if (phaseNumber !== undefined) {
    target = parseInt(phaseNumber, 10);
  } else if (state.currentPhase > 0) {
    target = state.currentPhase;
  } else {
    target = state.phases.length + 1;
  }

  const currentPhase = getCurrentPhase(state);
  const phaseState = currentPhase
    ? {
        discuss: currentPhase.discuss.status,
        plan: currentPhase.plan.status,
        execute: currentPhase.execute.status,
      }
    : null;

  return {
    workstreamId: ws.id,
    targetPhase: target,
    command: '',
    currentPhaseState: phaseState,
  };
}

export async function discussPhaseHandler(
  phaseNumber: string | undefined,
  options: PhaseCommandOptions,
): Promise<void> {
  const ctx = await resolvePhaseContext(phaseNumber, options);

  if (ctx.error) {
    if (options.json) {
      error('No workstream found for current branch.', { json: true });
    }
    return;
  }

  const result: PhaseCommandResult = {
    ...ctx,
    command: '/discuss-phase',
  };

  if (options.json) {
    output(result as unknown as Record<string, unknown>, { json: true });
  } else {
    console.log(`Use the /discuss-phase slash command in Claude Code to generate discussion context.`);
    console.log(`Target: workstream ${result.workstreamId}, phase ${result.targetPhase}`);
    if (result.currentPhaseState) {
      console.log(`\nCurrent phase state:`);
      console.log(`  discuss:  ${result.currentPhaseState.discuss}`);
      console.log(`  plan:     ${result.currentPhaseState.plan}`);
      console.log(`  execute:  ${result.currentPhaseState.execute}`);
    }
  }
}

export async function planPhaseHandler(
  phaseNumber: string | undefined,
  options: PhaseCommandOptions,
): Promise<void> {
  const ctx = await resolvePhaseContext(phaseNumber, options);

  if (ctx.error) {
    if (options.json) {
      error('No workstream found for current branch.', { json: true });
    }
    return;
  }

  const result: PhaseCommandResult = {
    ...ctx,
    command: '/plan-phase',
  };

  if (options.json) {
    output(result as unknown as Record<string, unknown>, { json: true });
  } else {
    console.log(`Use the /plan-phase slash command in Claude Code to create an implementation plan.`);
    console.log(`Target: workstream ${result.workstreamId}, phase ${result.targetPhase}`);
    if (result.currentPhaseState) {
      console.log(`\nCurrent phase state:`);
      console.log(`  discuss:  ${result.currentPhaseState.discuss}`);
      console.log(`  plan:     ${result.currentPhaseState.plan}`);
      console.log(`  execute:  ${result.currentPhaseState.execute}`);
    }
  }
}

export async function executePhaseHandler(
  phaseNumber: string | undefined,
  options: PhaseCommandOptions,
): Promise<void> {
  const ctx = await resolvePhaseContext(phaseNumber, options);

  if (ctx.error) {
    if (options.json) {
      error('No workstream found for current branch.', { json: true });
    }
    return;
  }

  const result: PhaseCommandResult = {
    ...ctx,
    command: '/execute-phase',
  };

  if (options.json) {
    output(result as unknown as Record<string, unknown>, { json: true });
  } else {
    console.log(`Use the /execute-phase slash command in Claude Code to update execution state.`);
    console.log(`Target: workstream ${result.workstreamId}, phase ${result.targetPhase}`);
    if (result.currentPhaseState) {
      console.log(`\nCurrent phase state:`);
      console.log(`  discuss:  ${result.currentPhaseState.discuss}`);
      console.log(`  plan:     ${result.currentPhaseState.plan}`);
      console.log(`  execute:  ${result.currentPhaseState.execute}`);
    }
  }
}

export function registerPhaseCommands(program: Command): void {
  program
    .command('discuss-phase')
    .description('Show guidance for creating phase discussion context')
    .argument('[phase-number]', 'Target phase number')
    .option('--json', 'Output in JSON format', false)
    .action(async (phaseNumber: string | undefined, opts: { json: boolean }) => {
      try {
        await discussPhaseHandler(phaseNumber, { json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const { error: errorFn } = await import('../output/index.js');
        errorFn(message, { json: opts.json });
        process.exit(1);
      }
    });

  program
    .command('plan-phase')
    .description('Show guidance for creating phase implementation plan')
    .argument('[phase-number]', 'Target phase number')
    .option('--json', 'Output in JSON format', false)
    .action(async (phaseNumber: string | undefined, opts: { json: boolean }) => {
      try {
        await planPhaseHandler(phaseNumber, { json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const { error: errorFn } = await import('../output/index.js');
        errorFn(message, { json: opts.json });
        process.exit(1);
      }
    });

  program
    .command('execute-phase')
    .description('Show guidance for updating phase execution state')
    .argument('[phase-number]', 'Target phase number')
    .option('--json', 'Output in JSON format', false)
    .action(async (phaseNumber: string | undefined, opts: { json: boolean }) => {
      try {
        await executePhaseHandler(phaseNumber, { json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const { error: errorFn } = await import('../output/index.js');
        errorFn(message, { json: opts.json });
        process.exit(1);
      }
    });
}
