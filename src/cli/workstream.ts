import { Command } from 'commander';
import { GitOps } from '../git/index.js';
import { createWorkstream } from '../workstream/create.js';
import { output, error, success } from '../output/index.js';

export function registerWorkstreamCommands(program: Command): void {
  const workstream = program
    .command('workstream')
    .description('Manage workstreams');

  workstream
    .command('create')
    .description('Create a new workstream from current branch')
    .option('--name <name>', 'Override auto-derived workstream ID')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      const jsonMode = opts.json as boolean;

      try {
        const git = new GitOps();

        if (!(await git.isGitRepo())) {
          error('Not a git repository.', { json: jsonMode });
          process.exit(1);
        }

        const repoRoot = await git.getRepoRoot();
        const result = await createWorkstream({
          repoRoot,
          nameOverride: opts.name as string | undefined,
        });

        if (jsonMode) {
          output(
            {
              workstreamId: result.workstreamId,
              branch: result.branch,
              path: result.path,
              created: result.created,
            },
            { json: true },
          );
        } else {
          success(
            `Workstream '${result.workstreamId}' created from branch '${result.branch}'`,
            { json: false },
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: jsonMode });
        process.exit(1);
      }
    });
}
