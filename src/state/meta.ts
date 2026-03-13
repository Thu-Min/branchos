import { readFile, writeFile } from 'fs/promises';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from './schema.js';

export interface WorkstreamMeta {
  schemaVersion: number;
  workstreamId: string;
  branch: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  assignee: string | null;
  issueNumber: number | null;
  featureId?: string;
}

export function createMeta(workstreamId: string, branch: string, featureId?: string, assignee: string | null = null): WorkstreamMeta {
  const now = new Date().toISOString();
  const meta: WorkstreamMeta = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    workstreamId,
    branch,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    assignee,
    issueNumber: null,
  };
  if (featureId !== undefined) {
    meta.featureId = featureId;
  }
  return meta;
}

export async function readMeta(filePath: string): Promise<WorkstreamMeta> {
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, unknown>;
  return migrateIfNeeded<WorkstreamMeta>(data);
}

export async function writeMeta(filePath: string, meta: WorkstreamMeta): Promise<void> {
  await writeFile(filePath, JSON.stringify(meta, null, 2) + '\n');
}
