import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerMapStatusCommand } from './map-status.js';
import { registerCheckDriftCommand } from './check-drift.js';
import { registerStatusCommand } from './status.js';
import { registerDetectConflictsCommand } from './detect-conflicts.js';
import { registerInstallCommandsCommand } from './install-commands.js';
import { registerWorkstreamCommands } from './workstream.js';
import { registerArchiveCommands } from './archive.js';
import { registerContextCommand } from './context.js';
import { registerFeaturesCommand } from './features.js';
import { registerIngestPrfaqCommand } from './ingest-prfaq.js';

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
registerWorkstreamCommands(program);
registerArchiveCommands(program);
registerContextCommand(program);
registerFeaturesCommand(program);
registerIngestPrfaqCommand(program);

// Show help when no arguments provided
program.action(() => {
  program.help();
});
