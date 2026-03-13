import { describe, it, expect, vi } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { createMeta, readMeta, WorkstreamMeta } from '../../src/state/meta.js';

describe('createMeta', () => {
  it('returns object with schemaVersion 3', () => {
    const meta = createMeta('payment-retry', 'feature/payment-retry');
    expect(meta.schemaVersion).toBe(3);
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

  it('has all required fields including assignee and issueNumber', () => {
    const meta = createMeta('test-id', 'feature/test');
    const keys = Object.keys(meta).sort();
    expect(keys).toEqual(['assignee', 'branch', 'createdAt', 'issueNumber', 'schemaVersion', 'status', 'updatedAt', 'workstreamId']);
  });

  it('without assignee param sets assignee to null and issueNumber to null', () => {
    const meta = createMeta('test-id', 'feature/test');
    expect(meta.assignee).toBeNull();
    expect(meta.issueNumber).toBeNull();
  });

  it('with assignee param sets assignee to provided value', () => {
    const meta = createMeta('test-id', 'feature/test', undefined, 'octocat');
    expect(meta.assignee).toBe('octocat');
  });

  it('with assignee=null explicitly sets assignee to null', () => {
    const meta = createMeta('test-id', 'feature/test', undefined, null);
    expect(meta.assignee).toBeNull();
  });
});

describe('readMeta', () => {
  it('migrates v2 data to include assignee and issueNumber as null', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'branchos-meta-test-'));
    const v2Meta = {
      schemaVersion: 2,
      workstreamId: 'test',
      branch: 'feature/test',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const filePath = join(tempDir, 'meta.json');
    await writeFile(filePath, JSON.stringify(v2Meta));
    const meta = await readMeta(filePath);
    expect(meta.assignee).toBeNull();
    expect(meta.issueNumber).toBeNull();
    expect(meta.schemaVersion).toBe(3);
    await rm(tempDir, { recursive: true, force: true });
  });
});
