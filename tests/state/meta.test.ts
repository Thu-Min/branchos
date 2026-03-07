import { describe, it, expect } from 'vitest';
import { createMeta, WorkstreamMeta } from '../../src/state/meta.js';

describe('createMeta', () => {
  it('returns object with schemaVersion 1', () => {
    const meta = createMeta('payment-retry', 'feature/payment-retry');
    expect(meta.schemaVersion).toBe(1);
  });

  it('sets correct workstreamId', () => {
    const meta = createMeta('payment-retry', 'feature/payment-retry');
    expect(meta.workstreamId).toBe('payment-retry');
  });

  it('sets correct branch', () => {
    const meta = createMeta('payment-retry', 'feature/payment-retry');
    expect(meta.branch).toBe('feature/payment-retry');
  });

  it('sets status to active', () => {
    const meta = createMeta('payment-retry', 'feature/payment-retry');
    expect(meta.status).toBe('active');
  });

  it('sets ISO timestamp for createdAt', () => {
    const meta = createMeta('test-id', 'feature/test');
    expect(() => new Date(meta.createdAt).toISOString()).not.toThrow();
    expect(meta.createdAt).toBe(new Date(meta.createdAt).toISOString());
  });

  it('sets updatedAt equal to createdAt on creation', () => {
    const meta = createMeta('test-id', 'feature/test');
    expect(meta.updatedAt).toBe(meta.createdAt);
  });

  it('has all required fields', () => {
    const meta = createMeta('test-id', 'feature/test');
    const keys = Object.keys(meta).sort();
    expect(keys).toEqual(['branch', 'createdAt', 'schemaVersion', 'status', 'updatedAt', 'workstreamId']);
  });
});
