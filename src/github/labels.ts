import { ghExec } from './index.js';

export async function ensureLabel(
  name: string,
  color: string,
): Promise<void> {
  await ghExec(['label', 'create', name, '--color', color, '--force']);
}

const STATUS_COLORS: Record<string, string> = {
  unassigned: 'CCCCCC',
  assigned: '0E8A16',
  'in-progress': 'FBCA04',
  complete: '0075CA',
  dropped: 'D93F0B',
};

export async function ensureStatusLabels(): Promise<void> {
  for (const [status, color] of Object.entries(STATUS_COLORS)) {
    await ensureLabel(status, color);
  }
}
