import { ghExec } from './index.js';

export async function ensureMilestone(title: string): Promise<void> {
  const existing = await ghExec([
    'api',
    'repos/{owner}/{repo}/milestones',
    '--jq',
    '.[].title',
  ]);

  const titles = existing
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  if (titles.includes(title)) {
    return;
  }

  await ghExec([
    'api',
    '--method',
    'POST',
    'repos/{owner}/{repo}/milestones',
    '-f',
    `title=${title}`,
    '-f',
    'state=open',
  ]);
}
