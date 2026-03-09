import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

describe('registerDetectConflictsCommand', () => {
  it('registers "detect-conflicts" command on program', async () => {
    const { registerDetectConflictsCommand } = await import('../../src/cli/detect-conflicts.js');
    const program = new Command();
    registerDetectConflictsCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'detect-conflicts');
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain('conflict');
  });

  it('has --all and --json options', async () => {
    const { registerDetectConflictsCommand } = await import('../../src/cli/detect-conflicts.js');
    const program = new Command();
    registerDetectConflictsCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'detect-conflicts')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--all');
    expect(optionNames).toContain('--json');
  });
});
