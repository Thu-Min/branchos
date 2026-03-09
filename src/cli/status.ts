import { Command } from 'commander';
import { statusHandler } from '../workstream/status.js';
import { error } from '../output/index.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show all active workstreams')
    .option('--all', 'Include archived workstreams', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (opts: { all: boolean; json: boolean }) => {
      try {
        await statusHandler({ all: opts.all, json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
