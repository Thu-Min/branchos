import { readFile, writeFile } from 'fs/promises';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from './schema.js';

export interface PhaseStep {
  status: 'not-started' | 'in-progress' | 'complete';
  createdAt?: string;
  updatedAt?: string;
}

export interface Phase {
  number: number;
  status: 'active' | 'completed';
  discuss: PhaseStep;
  plan: PhaseStep;
  execute: PhaseStep;
  planBaseline?: string;
}

export interface WorkstreamState {
  schemaVersion: number;
  status: 'created' | 'in-progress' | 'completed';
  tasks: unknown[];
  currentPhase: number;
  phases: Phase[];
}

export function createInitialState(): WorkstreamState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    status: 'created',
    tasks: [],
    currentPhase: 0,
    phases: [],
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
