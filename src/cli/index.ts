import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerWorkstreamCommands } from './workstream.js';
import { registerMapStatusCommand } from './map-status.js';
import { registerPhaseCommands } from './phase-commands.js';

export const program = new Command();

program
  .name('branchos')
  .description('Branch-based AI-assisted development workflow management')
  .version('0.1.0');

// Register commands
registerInitCommand(program);
registerWorkstreamCommands(program);
registerMapStatusCommand(program);
registerPhaseCommands(program);

// Show help when no arguments provided
program.action(() => {
  program.help();
});
