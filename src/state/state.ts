import { readFile, writeFile } from 'fs/promises';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from './schema.js';

export interface WorkstreamState {
  schemaVersion: number;
  status: 'created' | 'in-progress' | 'completed';
  tasks: unknown[];
}

export function createInitialState(): WorkstreamState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    status: 'created',
    tasks: [],
  };
}

export async function readState(filePath: string): Promise<WorkstreamState> {
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  return migrateIfNeeded<WorkstreamState>(data);
}

export async function writeState(filePath: string, state: WorkstreamState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state, null, 2) + '\n');
}
