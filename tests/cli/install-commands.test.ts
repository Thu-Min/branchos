import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

describe('install-commands', () => {
  describe('COMMANDS record', () => {
    it('has exactly 14 entries', async () => {
      const { COMMANDS } = await import('../../src/commands/index.js');
      expect(Object.keys(COMMANDS)).toHaveLength(14);
    });
  });

  describe('installSlashCommands', () => {
    let tempHome: string;
    let originalHome: string;

    beforeEach(async () => {
      tempHome = await mkdtemp(join(tmpdir(), 'branchos-install-test-'));
      originalHome = process.env.HOME || '';
      // Mock os.homedir by setting HOME env var
      process.env.HOME = tempHome;
    });

    afterEach(async () => {
      process.env.HOME = originalHome;
      await rm(tempHome, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it('writes 14 files to commands/ target directory', async () => {
      // Dynamic import to pick up mocked HOME
      vi.resetModules();
      const { installSlashCommands } = await import('../../src/cli/install-commands.js');
      installSlashCommands();

      const commandsDir = join(tempHome, '.claude', 'commands');
      const files = await readdir(commandsDir);
      expect(files.filter(f => f.startsWith('branchos:'))).toHaveLength(14);
    });

    it('writes 14 files to skills/ target directory', async () => {
      vi.resetModules();
      const { installSlashCommands } = await import('../../src/cli/install-commands.js');
      installSlashCommands();

      const skillsDir = join(tempHome, '.claude', 'skills');
      const files = await readdir(skillsDir);
      expect(files.filter(f => f.startsWith('branchos:'))).toHaveLength(14);
    });

    it('writes identical content to both directories', async () => {
      vi.resetModules();
      const { installSlashCommands } = await import('../../src/cli/install-commands.js');
      installSlashCommands();

      const commandsDir = join(tempHome, '.claude', 'commands');
      const skillsDir = join(tempHome, '.claude', 'skills');
      const commandFiles = await readdir(commandsDir);

      for (const file of commandFiles) {
        const cmdContent = await readFile(join(commandsDir, file), 'utf-8');
        const skillContent = await readFile(join(skillsDir, file), 'utf-8');
        expect(cmdContent).toBe(skillContent);
      }
    });
  });

  describe('uninstallSlashCommands', () => {
    let tempHome: string;
    let originalHome: string;

    beforeEach(async () => {
      tempHome = await mkdtemp(join(tmpdir(), 'branchos-uninstall-test-'));
      originalHome = process.env.HOME || '';
      process.env.HOME = tempHome;
    });

    afterEach(async () => {
      process.env.HOME = originalHome;
      await rm(tempHome, { recursive: true, force: true });
      vi.restoreAllMocks();
    });

    it('removes 14 files from both directories', async () => {
      vi.resetModules();
      const { installSlashCommands, uninstallSlashCommands } = await import('../../src/cli/install-commands.js');

      // Install first
      installSlashCommands();

      // Verify installed
      const commandsDir = join(tempHome, '.claude', 'commands');
      const skillsDir = join(tempHome, '.claude', 'skills');
      let cmdFiles = await readdir(commandsDir);
      expect(cmdFiles.filter(f => f.startsWith('branchos:'))).toHaveLength(14);

      // Uninstall
      uninstallSlashCommands();

      // Verify commands dir cleaned
      cmdFiles = await readdir(commandsDir).catch(() => []);
      expect(cmdFiles.filter((f: string) => f.startsWith('branchos:'))).toHaveLength(0);

      // Verify skills dir cleaned
      const skillFiles = await readdir(skillsDir).catch(() => []);
      expect(skillFiles.filter((f: string) => f.startsWith('branchos:'))).toHaveLength(0);
    });
  });

  describe('CLI program commands', () => {
    it('has "init" command registered', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('init');
    });

    it('has "install-commands" command registered', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('install-commands');
    });

    it('has version "2.0.1"', async () => {
      const { program } = await import('../../src/cli/index.js');
      expect(program.version()).toBe('2.0.1');
    });

    it('has "workstream" command', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('workstream');
    });

    it('has "ingest-prfaq" command', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('ingest-prfaq');
    });

    it('has "map-status" command (utility, kept for npx delegation)', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('map-status');
    });

    it('has "check-drift" command (utility, kept for npx delegation)', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('check-drift');
    });

    it('has "detect-conflicts" command (utility, kept for npx delegation)', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('detect-conflicts');
    });

    it('has "status" command (utility, kept for npx delegation)', async () => {
      const { program } = await import('../../src/cli/index.js');
      const commands = program.commands.map(c => c.name());
      expect(commands).toContain('status');
    });
  });
});
