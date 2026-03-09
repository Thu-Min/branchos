import { createInterface } from 'node:readline';
import { resolveCurrentWorkstream } from '../phase/index.js';
import { GitOps } from '../git/index.js';
import { createWorkstream } from './create.js';
import { isProtectedBranch } from './resolve.js';

/**
 * Prompt user with a yes/no question.
 * Returns false in non-TTY environments.
 */
export async function promptYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Ensure a workstream exists for the current branch.
 * Returns existing workstream if found, prompts to create one if not.
 * Returns null on protected branches or if user declines.
 */
export async function ensureWorkstream(
  repoRoot: string,
): Promise<{ id: string; path: string } | null> {
  const existing = await resolveCurrentWorkstream(repoRoot);
  if (existing) {
    return existing;
  }

  const git = new GitOps(repoRoot);
  const branch = await git.getCurrentBranch();

  if (isProtectedBranch(branch)) {
    return null;
  }

  const confirmed = await promptYesNo(
    `No workstream for branch '${branch}'. Create one now? (y/n) `,
  );

  if (!confirmed) {
    console.log('Workstream required for this command.');
    return null;
  }

  const result = await createWorkstream({ repoRoot });
  return { id: result.workstreamId, path: result.path };
}
