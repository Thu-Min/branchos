import { CURRENT_SCHEMA_VERSION } from './schema.js';

export interface BranchosConfig {
  schemaVersion: number;
}

export function createDefaultConfig(): BranchosConfig {
  return { schemaVersion: CURRENT_SCHEMA_VERSION };
}
