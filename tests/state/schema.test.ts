import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from '../../src/state/schema.js';
import { createInitialState } from '../../src/state/state.js';

describe('schema', () => {
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should equal 3', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(3);
    });
  });

  describe('migrateIfNeeded', () => {
    it('should return object unchanged when schemaVersion is current', () => {
      const input = { schemaVersion: 3, foo: 'bar', currentPhase: 0, phases: [], assignee: null, issueNumber: null };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(3);
      expect(result.foo).toBe('bar');
    });

    it('should set schemaVersion to current when missing', () => {
      const input = { foo: 'bar' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(3);
    });

    it('should preserve unknown fields (forward-compatible)', () => {
      const input = { schemaVersion: 3, known: 'yes', extra: 'data', nested: { deep: true }, currentPhase: 0, phases: [], assignee: null, issueNumber: null };
      const result = migrateIfNeeded(input);
      expect(result.known).toBe('yes');
      expect(result.extra).toBe('data');
      expect(result.nested).toEqual({ deep: true });
    });

    it('should set schemaVersion when it is 0', () => {
      const input = { schemaVersion: 0, data: 'test' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(3);
    });
  });

  describe('v1 to v2 migration', () => {
    it('should migrate v1 data to v2 with phases and currentPhase', () => {
      const v1Data = { schemaVersion: 1, status: 'created', tasks: [] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[] }>(v1Data);
      expect(result.schemaVersion).toBe(3);
      expect(result.currentPhase).toBe(0);
      expect(result.phases).toEqual([]);
    });

    it('should pass through v2 data and migrate to v3', () => {
      const v2Data = { schemaVersion: 2, status: 'in-progress', tasks: [], currentPhase: 1, phases: [{ number: 1 }] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[]; assignee: string | null; issueNumber: number | null }>(v2Data);
      expect(result.schemaVersion).toBe(3);
      expect(result.currentPhase).toBe(1);
      expect(result.phases).toEqual([{ number: 1 }]);
      expect(result.assignee).toBeNull();
      expect(result.issueNumber).toBeNull();
    });

    it('should migrate v0/missing schemaVersion data to v3', () => {
      const noVersion = { status: 'created', tasks: [] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[]; assignee: string | null; issueNumber: number | null }>(noVersion);
      expect(result.schemaVersion).toBe(3);
      expect(result.currentPhase).toBe(0);
      expect(result.phases).toEqual([]);
      expect(result.assignee).toBeNull();
      expect(result.issueNumber).toBeNull();
    });
  });

  describe('v2 to v3 migration', () => {
    it('should migrate v2 data to v3 with assignee and issueNumber as null', () => {
      const v2Data = { schemaVersion: 2, currentPhase: 1, phases: [{ number: 1 }], status: 'active' };
      const result = migrateIfNeeded<{ schemaVersion: number; assignee: string | null; issueNumber: number | null }>(v2Data);
      expect(result.schemaVersion).toBe(3);
      expect(result.assignee).toBeNull();
      expect(result.issueNumber).toBeNull();
    });

    it('should preserve existing v2 fields (currentPhase, phases) after migration', () => {
      const v2Data = { schemaVersion: 2, currentPhase: 3, phases: [{ number: 1 }, { number: 2 }] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[] }>(v2Data);
      expect(result.currentPhase).toBe(3);
      expect(result.phases).toEqual([{ number: 1 }, { number: 2 }]);
    });

    it('should pass through v3 data unchanged', () => {
      const v3Data = { schemaVersion: 3, assignee: 'octocat', issueNumber: 42, currentPhase: 0, phases: [] };
      const result = migrateIfNeeded<{ schemaVersion: number; assignee: string | null; issueNumber: number | null }>(v3Data);
      expect(result.schemaVersion).toBe(3);
      expect(result.assignee).toBe('octocat');
      expect(result.issueNumber).toBe(42);
    });
  });

  describe('createInitialState', () => {
    it('should return v3 shape with phases and currentPhase', () => {
      const state = createInitialState();
      expect(state.schemaVersion).toBe(3);
      expect(state.currentPhase).toBe(0);
      expect(state.phases).toEqual([]);
      expect(state.status).toBe('created');
      expect(state.tasks).toEqual([]);
    });
  });
});
