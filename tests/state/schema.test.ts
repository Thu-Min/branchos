import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from '../../src/state/schema.js';
import { createInitialState } from '../../src/state/state.js';

describe('schema', () => {
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should equal 2', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(2);
    });
  });

  describe('migrateIfNeeded', () => {
    it('should return object unchanged when schemaVersion is current', () => {
      const input = { schemaVersion: 2, foo: 'bar', currentPhase: 0, phases: [] };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(2);
      expect(result.foo).toBe('bar');
    });

    it('should set schemaVersion to current when missing', () => {
      const input = { foo: 'bar' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(2);
    });

    it('should preserve unknown fields (forward-compatible)', () => {
      const input = { schemaVersion: 2, known: 'yes', extra: 'data', nested: { deep: true }, currentPhase: 0, phases: [] };
      const result = migrateIfNeeded(input);
      expect(result.known).toBe('yes');
      expect(result.extra).toBe('data');
      expect(result.nested).toEqual({ deep: true });
    });

    it('should set schemaVersion when it is 0', () => {
      const input = { schemaVersion: 0, data: 'test' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(2);
    });
  });

  describe('v1 to v2 migration', () => {
    it('should migrate v1 data to v2 with phases and currentPhase', () => {
      const v1Data = { schemaVersion: 1, status: 'created', tasks: [] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[] }>(v1Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.currentPhase).toBe(0);
      expect(result.phases).toEqual([]);
    });

    it('should pass through v2 data unchanged', () => {
      const v2Data = { schemaVersion: 2, status: 'in-progress', tasks: [], currentPhase: 1, phases: [{ number: 1 }] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[] }>(v2Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.currentPhase).toBe(1);
      expect(result.phases).toEqual([{ number: 1 }]);
    });

    it('should migrate v0/missing schemaVersion data to v2', () => {
      const noVersion = { status: 'created', tasks: [] };
      const result = migrateIfNeeded<{ schemaVersion: number; currentPhase: number; phases: unknown[] }>(noVersion);
      expect(result.schemaVersion).toBe(2);
      expect(result.currentPhase).toBe(0);
      expect(result.phases).toEqual([]);
    });
  });

  describe('createInitialState', () => {
    it('should return v2 shape with phases and currentPhase', () => {
      const state = createInitialState();
      expect(state.schemaVersion).toBe(2);
      expect(state.currentPhase).toBe(0);
      expect(state.phases).toEqual([]);
      expect(state.status).toBe('created');
      expect(state.tasks).toEqual([]);
    });
  });
});
