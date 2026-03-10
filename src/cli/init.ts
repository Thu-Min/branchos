import { Command } from 'commander';
import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import {
  BRANCHOS_DIR,
  SHARED_DIR,
  WORKSTREAMS_DIR,
  CONFIG_FILE,
  RUNTIME_DIR,
} from '../constants.js';
import { createDefaultConfig } from '../state/config.js';
import { success, error, output } from '../output/index.js';
import { installSlashCommands } from './install-commands.js';

interface InitOptions {
  json: boolean;
  cwd?: string;
}

interface InitResult {
  success: boolean;
  created?: string[];
  skipped?: string[];
  error?: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initHandler(options: InitOptions): Promise<InitResult> {
  const cwd = options.cwd || process.cwd();
  const git = new GitOps(cwd);

  // Check if we're in a git repo
  if (!(await git.isGitRepo())) {
    const msg = 'Not a git repository. Run `git init` first.';
    if (!options.json) {
      error(msg, { json: false });
    }
    return { success: false, error: msg };
  }

  const repoRoot = await git.getRepoRoot();
  const branchosPath = join(repoRoot, BRANCHOS_DIR);
  const sharedPath = join(branchosPath, SHARED_DIR);
  const workstreamsPath = join(branchosPath, WORKSTREAMS_DIR);
  const configPath = join(branchosPath, CONFIG_FILE);
  const gitignorePath = join(repoRoot, '.gitignore');

  const created: string[] = [];
  const skipped: string[] = [];

  // Create directories
  for (const [dirPath, label] of [
    [sharedPath, `${BRANCHOS_DIR}/${SHARED_DIR}/`],
    [workstreamsPath, `${BRANCHOS_DIR}/${WORKSTREAMS_DIR}/`],
  ] as const) {
    if (await fileExists(dirPath)) {
      skipped.push(label);
    } else {
      await mkdir(dirPath, { recursive: true });
      // Add .gitkeep so empty dirs are tracked by git
      await writeFile(join(dirPath, '.gitkeep'), '');
      created.push(label);
    }
  }

  // Create config.json
  if (await fileExists(configPath)) {
    skipped.push(`${BRANCHOS_DIR}/${CONFIG_FILE}`);
  } else {
    const config = createDefaultConfig();
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    created.push(`${BRANCHOS_DIR}/${CONFIG_FILE}`);
  }

  // Update .gitignore
  let gitignoreContent = '';
  if (await fileExists(gitignorePath)) {
    gitignoreContent = await readFile(gitignorePath, 'utf-8');
  }

  const runtimeEntry = `${RUNTIME_DIR}/`;
  if (!gitignoreContent.includes(runtimeEntry)) {
    const separator = gitignoreContent.length > 0 && !gitignoreContent.endsWith('\n') ? '\n' : '';
    await writeFile(gitignorePath, gitignoreContent + separator + runtimeEntry + '\n');
    created.push('.gitignore');
  } else {
    skipped.push('.gitignore');
  }

  // Commit if there are new items
  if (created.length > 0) {
    const filesToAdd = [`${BRANCHOS_DIR}/`, '.gitignore'];
    await git.addAndCommit(filesToAdd, 'chore: initialize branchos');
  }

  // Auto-install slash commands (both fresh init and re-init)
  installSlashCommands();

  // Report results
  if (options.json) {
    return { success: true, created, skipped };
  }

  if (created.length > 0) {
    success('BranchOS initialized!', { json: false });
    for (const item of created) {
      success(`Created ${item}`, { json: false });
    }
    success('Slash commands installed to ~/.claude/commands/ and ~/.claude/skills/', { json: false });
  } else {
    success('Already initialized, nothing to do.', { json: false });
    success('Slash commands refreshed.', { json: false });
  }

  if (skipped.length > 0) {
    for (const item of skipped) {
      output({ skipped: item }, { json: false });
    }
  }

  return { success: true, created, skipped };
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize BranchOS in this repository')
    .option('--json', 'Output in JSON format', false)
    .action(async (opts) => {
      const result = await initHandler({ json: opts.json });
      if (!result.success) {
        process.exit(1);
      }
    });
}
