import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { checkStaleness, StalenessResult } from '../map/staleness.js';
import { getStalenessThreshold, createDefaultConfig, BranchosConfig } from '../state/config.js';
import { BRANCHOS_DIR, CONFIG_FILE } from '../constants.js';
import { output, warning } from '../output/index.js';

export interface MapStatusOptions {
  json?: boolean;
  cwd?: string;
  threshold?: number;
}

export async function mapStatusHandler(
  options: MapStatusOptions,
): Promise<StalenessResult> {
  const git = new GitOps(options.cwd);
  const repoRoot = await git.getRepoRoot();

  // Load config
  let config: BranchosConfig;
  try {
    const configPath = join(repoRoot, BRANCHOS_DIR, CONFIG_FILE);
    const raw = await readFile(configPath, 'utf-8');
    config = JSON.parse(raw) as BranchosConfig;
  } catch {
    config = createDefaultConfig();
  }

  const threshold = options.threshold ?? getStalenessThreshold(config);
  const result = await checkStaleness(repoRoot, threshold);

  if (!result.exists) {
    if (options.json) {
      output({ exists: false }, { json: true });
    } else {
      console.log('No codebase map found. Run /map-codebase to generate one.');
    }
  } else {
    if (options.json) {
      output(result as unknown as Record<string, unknown>, { json: true });
    } else {
      console.log(`Map commit: ${result.mapCommit}`);
      console.log(`Generated: ${result.generated}`);
      console.log(`HEAD commit: ${result.headCommit}`);
      console.log(`Commits behind: ${result.commitsBehind === -1 ? 'unknown (hash not found)' : result.commitsBehind}`);
      console.log(`Stale: ${result.isStale ? 'yes' : 'no'}`);

      if (result.isStale) {
        warning('Codebase map is stale. Run /map-codebase to refresh.', { json: false });
      }
    }
  }

  return result;
}

export function registerMapStatusCommand(program: Command): void {
  program
    .command('map-status')
    .description('Show codebase map status and staleness')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts: { json: boolean }) => {
      try {
        await mapStatusHandler({ json: opts.json });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const { error } = await import('../output/index.js');
        error(message, { json: opts.json });
        process.exit(1);
      }
    });
}
