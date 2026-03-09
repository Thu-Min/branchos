import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

describe('registerStatusCommand', () => {
  it('registers "status" command on program', async () => {
    const { registerStatusCommand } = await import('../../src/cli/status.js');
    const program = new Command();
    registerStatusCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'status');
    expect(cmd).toBeDefined();
    expect(cmd!.description()).toContain('workstream');
  });

  it('has --all and --json options', async () => {
    const { registerStatusCommand } = await import('../../src/cli/status.js');
    const program = new Command();
    registerStatusCommand(program);

    const cmd = program.commands.find((c) => c.name() === 'status')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--all');
    expect(optionNames).toContain('--json');
  });
});
