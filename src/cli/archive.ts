import { Command } from 'commander';
import { archiveHandler, unarchiveHandler } from '../workstream/archive.js';
import { error } from '../output/index.js';

export function registerArchiveCommands(program: Command): void {
  program
    .command('archive <workstream>')
    .description('Archive a completed workstream')
    .option('--force', 'Skip merge check and force archive', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (workstream: string, opts: { force: boolean; json: boolean }) => {
      try {
        await archiveHandler({
          workstreamId: workstream,
          force: opts.force,
          json: opts.json,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });

  program
    .command('unarchive <workstream>')
    .description('Unarchive a workstream back to active')
    .option('--json', 'Output in JSON format', false)
    .action(async (workstream: string, opts: { json: boolean }) => {
      try {
        await unarchiveHandler({
          workstreamId: workstream,
          json: opts.json,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
