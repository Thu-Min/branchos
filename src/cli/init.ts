import { Command } from 'commander';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize BranchOS in this repository')
    .option('--json', 'Output in JSON format')
    .action(async () => {
      // Stub - full implementation in Task 2
      console.log('Init command placeholder');
    });
}
