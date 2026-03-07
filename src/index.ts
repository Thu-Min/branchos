import { Command } from 'commander';

const program = new Command();

program
  .name('branchos')
  .description('Branch-based AI-assisted development workflow management')
  .version('0.1.0');

program.parse();
