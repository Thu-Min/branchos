import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerMapStatusCommand } from './map-status.js';
import { registerCheckDriftCommand } from './check-drift.js';
import { registerStatusCommand } from './status.js';
import { registerDetectConflictsCommand } from './detect-conflicts.js';
import { registerInstallCommandsCommand } from './install-commands.js';

export const program = new Command();

program
  .name('branchos')
  .description('Branch-based AI-assisted development workflow management')
  .version('2.0.0');

// Register bootstrapper commands
registerInitCommand(program);
registerInstallCommandsCommand(program);

// Register utility commands (needed by /branchos:status via npx delegation)
registerMapStatusCommand(program);
registerCheckDriftCommand(program);
registerDetectConflictsCommand(program);
registerStatusCommand(program);

// Show help when no arguments provided
program.action(() => {
  program.help();
});
