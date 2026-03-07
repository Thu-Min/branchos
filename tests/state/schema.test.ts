import { describe, it, expect } from 'vitest';
import { CURRENT_SCHEMA_VERSION, migrateIfNeeded } from '../../src/state/schema.js';

describe('schema', () => {
  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should equal 1', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1);
    });
  });

  describe('migrateIfNeeded', () => {
    it('should return object unchanged when schemaVersion is current', () => {
      const input = { schemaVersion: 1, foo: 'bar' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(1);
      expect(result.foo).toBe('bar');
    });

    it('should set schemaVersion to current when missing', () => {
      const input = { foo: 'bar' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(1);
    });

    it('should preserve unknown fields (forward-compatible)', () => {
      const input = { schemaVersion: 1, known: 'yes', extra: 'data', nested: { deep: true } };
      const result = migrateIfNeeded(input);
      expect(result.known).toBe('yes');
      expect(result.extra).toBe('data');
      expect(result.nested).toEqual({ deep: true });
    });

    it('should set schemaVersion when it is 0', () => {
      const input = { schemaVersion: 0, data: 'test' };
      const result = migrateIfNeeded(input);
      expect(result.schemaVersion).toBe(1);
    });
  });
});
