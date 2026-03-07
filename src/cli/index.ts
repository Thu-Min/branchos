import { Command } from 'commander';
import { registerInitCommand } from './init.js';

export const program = new Command();

program
  .name('branchos')
  .description('Branch-based AI-assisted development workflow management')
  .version('0.1.0');

// Register commands
registerInitCommand(program);

// Workstream command group (placeholder - subcommands added in Plan 03)
const workstream = program
  .command('workstream')
  .description('Manage workstreams');

workstream
  .command('create')
  .description('Create a new workstream (coming soon)')
  .action(() => {
    console.log('Workstream create not yet implemented.');
  });

// Show help when no arguments provided
program.action(() => {
  program.help();
});
