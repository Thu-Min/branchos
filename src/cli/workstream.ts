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
    .option('--feature <id>', 'Link to a feature by ID (e.g., F-001)')
    .option('--issue <number>', 'Create from GitHub issue number (e.g., 42 or #42)')
    .option('--yes', 'Skip interactive prompts and auto-accept')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      const jsonMode = opts.json as boolean;

      try {
        const git = new GitOps();

        if (!(await git.isGitRepo())) {
          error('Not a git repository.', { json: jsonMode });
          process.exit(1);
        }

        // Parse and validate --issue flag
        let issueNumber: number | undefined;
        if (opts.issue) {
          const raw = String(opts.issue).replace(/^#/, '');
          const parsed = parseInt(raw, 10);
          if (Number.isNaN(parsed) || parsed <= 0) {
            error(
              `Invalid issue number: '${opts.issue}'. Provide a positive integer (e.g., 42 or #42).`,
              { json: jsonMode },
            );
            process.exit(1);
          }
          issueNumber = parsed;
        }

        // Mutual exclusivity check at CLI layer
        if (opts.feature && issueNumber) {
          error(
            'Cannot use --issue and --feature together. Use one or the other.',
            { json: jsonMode },
          );
          process.exit(1);
        }

        const repoRoot = await git.getRepoRoot();
        const result = await createWorkstream({
          repoRoot,
          nameOverride: opts.name as string | undefined,
          featureId: opts.feature as string | undefined,
          issueNumber,
          yes: opts.yes as boolean | undefined,
        });

        if (jsonMode) {
          output(
            {
              workstreamId: result.workstreamId,
              branch: result.branch,
              path: result.path,
              created: result.created,
              ...(result.featureId ? { featureId: result.featureId } : {}),
            },
            { json: true },
          );
        } else {
          if (result.featureId) {
            success(
              `Workstream '${result.workstreamId}' created for feature '${result.featureId}' on branch '${result.branch}'`,
              { json: false },
            );
          } else {
            success(
              `Workstream '${result.workstreamId}' created from branch '${result.branch}'`,
              { json: false },
            );
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(message, { json: jsonMode });
        process.exit(1);
      }
    });
}
