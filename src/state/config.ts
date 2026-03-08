import { CURRENT_SCHEMA_VERSION } from './schema.js';

export interface MapConfig {
  excludes?: string[];
  stalenessThreshold?: number;
}

export interface BranchosConfig {
  schemaVersion: number;
  map?: MapConfig;
}

const DEFAULT_MAP_EXCLUDES: string[] = [
  'node_modules',
  'dist',
  'build',
  '.branchos',
  '.git',
  '*.lock',
  '*.min.*',
];

const DEFAULT_STALENESS_THRESHOLD = 20;

export function createDefaultConfig(): BranchosConfig {
  return { schemaVersion: CURRENT_SCHEMA_VERSION };
}

export function getMapExcludes(config: BranchosConfig): string[] {
  return config.map?.excludes ?? DEFAULT_MAP_EXCLUDES;
}

export function getStalenessThreshold(config: BranchosConfig): number {
  return config.map?.stalenessThreshold ?? DEFAULT_STALENESS_THRESHOLD;
}
