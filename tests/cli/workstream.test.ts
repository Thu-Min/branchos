import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('branchos workstream create CLI', () => {
  let tempDir: string;
  const cliPath = join(__dirname, '..', '..', 'dist', 'index.cjs');

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'branchos-cli-ws-'));
    execSync('git init', { cwd: tempDir });
    execSync('git config user.email "test@test.com"', { cwd: tempDir });
    execSync('git config user.name "Test"', { cwd: tempDir });
    execSync('git commit --allow-empty -m "initial"', { cwd: tempDir });
    await mkdir(join(tempDir, '.branchos', 'workstreams'), { recursive: true });
    await mkdir(join(tempDir, '.branchos', 'shared'), { recursive: true });
    await writeFile(join(tempDir, '.branchos', 'config.json'), '{"schemaVersion":1}\n');
    execSync('git add .branchos/ && git commit -m "init branchos"', { cwd: tempDir });
    execSync('git checkout -b feature/test-feature', { cwd: tempDir, stdio: 'pipe' });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates workstream and shows success output', () => {
    const output = execSync(`node ${cliPath} workstream create`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(output).toContain('test-feature');
  });

  it('uses --name override', () => {
    const output = execSync(`node ${cliPath} workstream create --name custom-id`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    expect(output).toContain('custom-id');
  });

  it('outputs valid JSON with --json flag', () => {
    const output = execSync(`node ${cliPath} workstream create --json`, {
      cwd: tempDir,
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('workstreamId', 'test-feature');
    expect(parsed).toHaveProperty('created', true);
  });
});
