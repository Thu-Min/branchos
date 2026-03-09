import { Command } from 'commander';
import { detectConflictsHandler } from '../workstream/conflicts.js';
import { error } from '../output/index.js';

export function registerDetectConflictsCommand(program: Command): void {
  program
    .command('detect-conflicts')
    .description('Detect file-level conflict overlap between active workstreams')
    .option('--all', 'Check all workstream pairs', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (opts: { all: boolean; json: boolean }) => {
      try {
        await detectConflictsHandler({ all: opts.all, json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
