import { join } from 'path';
import { readFile } from 'fs/promises';
import chalk from 'chalk';
import { GitOps } from '../git/index.js';
import { discoverWorkstreams } from './discover.js';
import { readMeta } from '../state/meta.js';
import { readState } from '../state/state.js';
import { parseAffectedFiles } from '../phase/drift.js';
import { resolveCurrentWorkstream } from '../phase/index.js';
import { warning } from '../output/index.js';
import { BRANCHOS_DIR, WORKSTREAMS_DIR, PHASES_DIR, PROTECTED_BRANCHES } from '../constants.js';

export interface WorkstreamFiles {
  id: string;
  planned: string[];
  changed: string[];
}

export interface FileConflict {
  file: string;
  severity: 'high' | 'medium';
  workstreams: Array<{ id: string; source: 'planned' | 'changed' }>;
}

/**
 * Pure function: detect file-level conflicts between workstreams.
 * Returns conflicts sorted by severity (high first) then filename.
 */
export function detectConflicts(workstreams: WorkstreamFiles[]): FileConflict[] {
  // Build map: file -> Array<{ id, source }>
  const fileMap = new Map<string, Array<{ id: string; source: 'planned' | 'changed' }>>();

  for (const ws of workstreams) {
    const seen = new Set<string>();

    // Add changed files first (takes priority)
    for (const file of ws.changed) {
      seen.add(file);
      const entries = fileMap.get(file) ?? [];
      entries.push({ id: ws.id, source: 'changed' });
      fileMap.set(file, entries);
    }

    // Add planned files only if not already seen as changed
    for (const file of ws.planned) {
      if (seen.has(file)) continue;
      seen.add(file);
      const entries = fileMap.get(file) ?? [];
      entries.push({ id: ws.id, source: 'planned' });
      fileMap.set(file, entries);
    }
  }

  // Filter to files touched by 2+ unique workstreams
  const conflicts: FileConflict[] = [];
  for (const [file, entries] of fileMap) {
    const uniqueIds = new Set(entries.map((e) => e.id));
    if (uniqueIds.size < 2) continue;

    const allChanged = entries.every((e) => e.source === 'changed');
    const severity: 'high' | 'medium' = allChanged ? 'high' : 'medium';

    conflicts.push({ file, severity, workstreams: entries });
  }

  // Sort: high before medium, then alphabetical
  conflicts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'high' ? -1 : 1;
    }
    return a.file.localeCompare(b.file);
  });

  return conflicts;
}

/**
 * Gather planned and changed files for each workstream.
 */
export async function gatherWorkstreamFiles(options: {
  repoRoot: string;
  workstreamIds: string[];
  includeArchived?: boolean;
}): Promise<WorkstreamFiles[]> {
  const { repoRoot, workstreamIds, includeArchived } = options;
  const git = new GitOps(repoRoot);
  const results: WorkstreamFiles[] = [];

  for (const id of workstreamIds) {
    const wsPath = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR, id);

    // Read meta
    let meta;
    try {
      meta = await readMeta(join(wsPath, 'meta.json'));
    } catch {
      continue;
    }

    // Skip archived unless requested
    if (meta.status === 'archived' && !includeArchived) {
      continue;
    }

    // Read state to find current phase
    let state;
    try {
      state = await readState(join(wsPath, 'state.json'));
    } catch {
      results.push({ id: meta.workstreamId || id, planned: [], changed: [] });
      continue;
    }

    // Get planned files from plan.md
    let planned: string[] = [];
    if (state.currentPhase > 0) {
      const planPath = join(wsPath, PHASES_DIR, String(state.currentPhase), 'plan.md');
      try {
        const planContent = await readFile(planPath, 'utf-8');
        planned = parseAffectedFiles(planContent);
      } catch {
        // Missing plan.md is not an error
      }
    }

    // Get actual changed files from git
    let changed: string[] = [];
    for (const baseBranch of PROTECTED_BRANCHES) {
      try {
        changed = await git.getChangedFilesForBranch(meta.branch, baseBranch);
        if (changed.length > 0) break;
      } catch {
        // Try next protected branch
      }
    }

    results.push({ id: meta.workstreamId || id, planned, changed });
  }

  return results;
}

/**
 * Handler for detect-conflicts command.
 */
export async function detectConflictsHandler(options: {
  all?: boolean;
  json?: boolean;
  repoRoot?: string;
}): Promise<FileConflict[] | null> {
  const git = new GitOps(options.repoRoot);
  const repoRoot = options.repoRoot ?? (await git.getRepoRoot());
  const workstreamsDir = join(repoRoot, BRANCHOS_DIR, WORKSTREAMS_DIR);

  // Discover all workstreams
  const ids = await discoverWorkstreams(workstreamsDir);
  if (ids.length < 2) {
    if (!options.json) {
      console.log('No file conflicts detected (fewer than 2 workstreams).');
    } else {
      console.log(JSON.stringify([]));
    }
    return null;
  }

  // Resolve current workstream
  const current = await resolveCurrentWorkstream(repoRoot);

  // Gather files for all workstreams
  const wsFiles = await gatherWorkstreamFiles({ repoRoot, workstreamIds: ids });

  // Detect conflicts
  let conflicts = detectConflicts(wsFiles);

  // If not --all, filter to conflicts involving current workstream
  if (!options.all && current) {
    conflicts = conflicts.filter((c) =>
      c.workstreams.some((w) => w.id === current.id),
    );
  }

  if (conflicts.length === 0) {
    if (options.json) {
      console.log(JSON.stringify([]));
    } else {
      console.log('No file conflicts detected.');
    }
    return null;
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify(conflicts, null, 2));
  } else {
    console.log(chalk.bold(`Found ${conflicts.length} file conflict(s):\n`));
    for (const conflict of conflicts) {
      const severityLabel =
        conflict.severity === 'high'
          ? chalk.red('[HIGH]')
          : chalk.yellow('[MEDIUM]');

      console.log(`${severityLabel} ${conflict.file}`);
      for (const ws of conflict.workstreams) {
        console.log(`  - ${ws.id} (${ws.source})`);
      }
      console.log('');
    }
  }

  return conflicts;
}
