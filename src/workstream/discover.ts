import { readdir, access } from 'fs/promises';
import { join } from 'path';

export async function discoverWorkstreams(workstreamsDir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(workstreamsDir);
  } catch {
    return [];
  }

  const workstreamIds: string[] = [];

  for (const entry of entries) {
    const metaPath = join(workstreamsDir, entry, 'meta.json');
    try {
      await access(metaPath);
      workstreamIds.push(entry);
    } catch {
      // Not a workstream directory (no meta.json)
    }
  }

  return workstreamIds;
}
