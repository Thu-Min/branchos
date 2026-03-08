import { readFile } from 'fs/promises';
import { join } from 'path';
import { GitOps } from '../git/index.js';
import { parseMapMetadata, MAP_FILES } from './metadata.js';
import { BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR } from '../constants.js';

export interface StalenessResult {
  exists: boolean;
  commitsBehind: number;
  isStale: boolean;
  mapCommit?: string;
  headCommit?: string;
  generated?: string;
}

const DEFAULT_THRESHOLD = 20;

export async function checkStaleness(
  repoRoot: string,
  threshold?: number,
): Promise<StalenessResult> {
  const effectiveThreshold = threshold ?? DEFAULT_THRESHOLD;
  const codebaseDir = join(repoRoot, BRANCHOS_DIR, SHARED_DIR, CODEBASE_DIR);
  const git = new GitOps(repoRoot);

  // Try each map file to find valid metadata
  for (const mapFile of MAP_FILES) {
    const filePath = join(codebaseDir, mapFile);
    let content: string;
    try {
      content = await readFile(filePath, 'utf-8');
    } catch {
      continue; // File doesn't exist, try next
    }

    const metadata = parseMapMetadata(content);
    if (!metadata) {
      continue; // No valid metadata, try next
    }

    const headCommit = await git.getHeadHash();
    const behind = await git.getCommitsBehind(metadata.commit);
    const isStale = behind === -1 || behind >= effectiveThreshold;

    return {
      exists: true,
      commitsBehind: behind,
      isStale,
      mapCommit: metadata.commit,
      headCommit,
      generated: metadata.generated,
    };
  }

  // No valid map files found
  return {
    exists: false,
    commitsBehind: -1,
    isStale: false,
  };
}
