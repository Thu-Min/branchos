import { defineConfig } from 'vitest/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Plugin } from 'vite';

function markdownRawPlugin(): Plugin {
  return {
    name: 'markdown-raw',
    transform(_code: string, id: string) {
      if (id.endsWith('.md')) {
        const content = fs.readFileSync(id, 'utf-8');
        return {
          code: `export default ${JSON.stringify(content)};`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [markdownRawPlugin()],
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
  },
});
