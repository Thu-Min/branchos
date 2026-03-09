import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

describe('registerArchiveCommands', () => {
  it('registers "archive" command on program', async () => {
    const { registerArchiveCommands } = await import('../../src/cli/archive.js');
    const program = new Command();
    registerArchiveCommands(program);

    const cmd = program.commands.find((c) => c.name() === 'archive');
    expect(cmd).toBeDefined();
    expect(cmd!.description().toLowerCase()).toContain('archive');
  });

  it('registers "unarchive" command on program', async () => {
    const { registerArchiveCommands } = await import('../../src/cli/archive.js');
    const program = new Command();
    registerArchiveCommands(program);

    const cmd = program.commands.find((c) => c.name() === 'unarchive');
    expect(cmd).toBeDefined();
  });

  it('archive has --force and --json options', async () => {
    const { registerArchiveCommands } = await import('../../src/cli/archive.js');
    const program = new Command();
    registerArchiveCommands(program);

    const cmd = program.commands.find((c) => c.name() === 'archive')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--json');
  });

  it('unarchive has --json option', async () => {
    const { registerArchiveCommands } = await import('../../src/cli/archive.js');
    const program = new Command();
    registerArchiveCommands(program);

    const cmd = program.commands.find((c) => c.name() === 'unarchive')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--json');
  });
});
