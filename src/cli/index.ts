import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerWorkstreamCommands } from './workstream.js';
import { registerMapStatusCommand } from './map-status.js';
import { registerPhaseCommands } from './phase-commands.js';
import { registerCheckDriftCommand } from './check-drift.js';
import { registerContextCommand } from './context.js';
import { registerStatusCommand } from './status.js';
import { registerArchiveCommands } from './archive.js';
import { registerDetectConflictsCommand } from './detect-conflicts.js';

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
registerCheckDriftCommand(program);
registerContextCommand(program);
registerStatusCommand(program);
registerArchiveCommands(program);
registerDetectConflictsCommand(program);

// Show help when no arguments provided
program.action(() => {
  program.help();
});
