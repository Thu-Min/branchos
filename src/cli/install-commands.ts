import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { COMMANDS } from '../commands/index.js';

function getTargetDirs(): string[] {
  return [
    path.join(os.homedir(), '.claude', 'commands'),
    path.join(os.homedir(), '.claude', 'skills'),
  ];
}

export function installSlashCommands(): void {
  const dirs = getTargetDirs();
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
    for (const [filename, content] of Object.entries(COMMANDS)) {
      fs.writeFileSync(path.join(dir, filename), content, 'utf-8');
    }
  }
}

export function uninstallSlashCommands(): void {
  const dirs = getTargetDirs();
  let removed = 0;
  for (const dir of dirs) {
    for (const filename of Object.keys(COMMANDS)) {
      const target = path.join(dir, filename);
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        removed++;
      }
    }
  }
  return;
}

export function registerInstallCommandsCommand(program: Command): void {
  program
    .command('install-commands')
    .description('Install branchos slash commands for Claude Code')
    .option('--uninstall', 'Remove installed slash commands')
    .action((options: { uninstall?: boolean }) => {
      if (options.uninstall) {
        const dirs = getTargetDirs();
        let removed = 0;
        for (const dir of dirs) {
          for (const filename of Object.keys(COMMANDS)) {
            const target = path.join(dir, filename);
            if (fs.existsSync(target)) {
              fs.unlinkSync(target);
              console.log(`  Removed ${filename} from ${dir}`);
              removed++;
            }
          }
        }
        if (removed === 0) {
          console.log('No branchos commands found to remove.');
        } else {
          console.log(`\n✓ Removed branchos slash commands from both directories.`);
        }
        return;
      }

      installSlashCommands();

      const dirs = getTargetDirs();
      const installed = Object.keys(COMMANDS).length;
      for (const dir of dirs) {
        console.log(`  Installed ${installed} commands to ${dir}`);
      }
      console.log(`\n✓ Installed ${installed} slash commands to commands/ and skills/`);
      console.log('  Restart Claude Code to use them.');
    });
}
