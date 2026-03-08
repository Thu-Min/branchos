import { describe, it, expect } from 'vitest';
import {
  BranchosConfig,
  createDefaultConfig,
  getMapExcludes,
  getStalenessThreshold,
} from '../../src/state/config.js';

describe('createDefaultConfig', () => {
  it('returns config with schemaVersion', () => {
    const config = createDefaultConfig();
    expect(config.schemaVersion).toBe(1);
  });
});

describe('getMapExcludes', () => {
  it('returns config.map.excludes when present', () => {
    const config: BranchosConfig = {
      schemaVersion: 1,
      map: { excludes: ['custom1', 'custom2'] },
    };
    expect(getMapExcludes(config)).toEqual(['custom1', 'custom2']);
  });

  it('returns defaults when map field is undefined', () => {
    const config: BranchosConfig = { schemaVersion: 1 };
    const result = getMapExcludes(config);
    expect(result).toContain('node_modules');
    expect(result).toContain('dist');
    expect(result).toContain('.git');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns defaults when map.excludes is undefined', () => {
    const config: BranchosConfig = {
      schemaVersion: 1,
      map: { stalenessThreshold: 10 },
    };
    const result = getMapExcludes(config);
    expect(result).toContain('node_modules');
  });
});

describe('getStalenessThreshold', () => {
  it('returns config.map.stalenessThreshold when present', () => {
    const config: BranchosConfig = {
      schemaVersion: 1,
      map: { stalenessThreshold: 30 },
    };
    expect(getStalenessThreshold(config)).toBe(30);
  });

  it('returns 20 as default when map field is undefined', () => {
    const config: BranchosConfig = { schemaVersion: 1 };
    expect(getStalenessThreshold(config)).toBe(20);
  });

  it('returns 20 as default when map.stalenessThreshold is undefined', () => {
    const config: BranchosConfig = {
      schemaVersion: 1,
      map: { excludes: ['node_modules'] },
    };
    expect(getStalenessThreshold(config)).toBe(20);
  });
});
