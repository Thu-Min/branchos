import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/state/state.js';

describe('createInitialState', () => {
  it('returns schemaVersion 1', () => {
    const state = createInitialState();
    expect(state.schemaVersion).toBe(1);
  });

  it('returns status "created"', () => {
    const state = createInitialState();
    expect(state.status).toBe('created');
  });

  it('returns empty tasks array', () => {
    const state = createInitialState();
    expect(state.tasks).toEqual([]);
  });

  it('has all required fields', () => {
    const state = createInitialState();
    const keys = Object.keys(state).sort();
    expect(keys).toEqual(['schemaVersion', 'status', 'tasks']);
  });
});
