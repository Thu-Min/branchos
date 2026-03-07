# Technology Stack

**Project:** BranchOS
**Researched:** 2026-03-07
**Overall confidence:** MEDIUM (versions unverified against npm registry -- WebSearch, Bash, and WebFetch were unavailable during research; recommendations are based on deep ecosystem knowledge but exact latest versions should be confirmed before `npm init`)

## Recommended Stack

### Core Language & Runtime

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| TypeScript | ^5.5 | Language | Project constraint. Strict mode (`strict: true`) from day one. Use `NodeNext` module resolution for ESM compatibility. | HIGH (well-established, version range is safe) |
| Node.js | >=20 | Runtime | LTS. Native ESM support, stable `fs/promises`, `node:` protocol. v20 is LTS until April 2026; v22 is current LTS. Set `engines` in package.json. | HIGH |

### CLI Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Commander.js | ^13.0 | Argument parsing, subcommands | The standard for TypeScript CLIs. BranchOS needs subcommands (`branchos map-codebase`, `branchos workstream create`, etc.) which Commander handles cleanly. Lightweight (~30KB), zero dependencies, excellent TypeScript types. More appropriate than oclif (too heavy for this scope) or yargs (weaker TS support). | MEDIUM (v12 confirmed in training data, v13 likely by now) |

**Why not alternatives:**
- **oclif**: Designed for Salesforce-scale CLIs with plugin systems, code generation, and heavy abstractions. BranchOS is a focused tool, not a plugin platform. oclif's overhead (110+ dependencies) is unjustified.
- **yargs**: Weaker TypeScript support, less intuitive subcommand model, API surface is sprawling. Commander's `.command()` chaining maps directly to BranchOS's command structure.
- **citty/unbuild (unjs)**: Promising but immature ecosystem. Lower adoption, fewer battle-tested patterns. Risk of API changes.
- **clipanion**: Good TS support but niche adoption. Commander's ecosystem is 10x larger.
- **meow**: Too minimal -- no built-in subcommand support.

### Build & Compilation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| tsup | ^8.0 | Bundle TypeScript to distributable JS | Wraps esbuild for fast builds with sensible defaults. Produces clean ESM or CJS output. Single `tsup.config.ts` file. Handles shebang insertion for CLI bins. Much simpler than raw esbuild config or webpack. | MEDIUM (v8 confirmed) |

**Why not alternatives:**
- **tsc only**: No bundling, produces many files, slower. Fine for libraries but CLIs benefit from single-file output.
- **esbuild directly**: Requires manual configuration for TypeScript paths, shebangs, and declaration files. tsup wraps this cleanly.
- **unbuild**: Less mature, fewer CLI-specific features.
- **rollup**: Overkill configuration for a CLI tool.
- **tsx (runtime)**: Good for development (`tsx watch`) but not for distribution. Use tsx for dev, tsup for build.

### Git Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| simple-git | ^3.27 | Programmatic git operations | The standard Node.js git library. Wraps git CLI (requires git installed, which is fine -- BranchOS users are developers). Promise-based API, good TypeScript types. Covers all BranchOS needs: branch detection, diff, log, status, commit detection for staleness. | MEDIUM (v3.x confirmed, patch version approximate) |

**Why not alternatives:**
- **isomorphic-git**: Pure JS git implementation. Impressive but unnecessary -- BranchOS targets developer machines that always have git installed. isomorphic-git is slower for common operations and has a larger bundle.
- **Raw `child_process.exec`**: Works but you'd rebuild error handling, output parsing, and promise wrapping that simple-git already provides. Not worth the maintenance cost.
- **nodegit (libgit2 bindings)**: Native module with platform-specific compilation issues. Installation failures are common. simple-git's git CLI wrapper is more reliable across environments.

### State Management (File-Based)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Node.js `fs/promises` | built-in | File I/O | Native, zero dependencies. `readFile`, `writeFile`, `mkdir` with `{ recursive: true }`. No library needed. | HIGH |
| Zod | ^3.23 | Schema validation for state files | Validate `state.json` and config structures at read time. Catches corruption, provides clear error messages. Also generates TypeScript types from schemas (single source of truth). | MEDIUM (v3.23 confirmed, Zod 4 may be in beta/RC by now) |

**Why not alternatives for validation:**
- **JSON Schema (ajv)**: More verbose schema definitions, separate type generation step. Zod schemas ARE TypeScript -- tighter DX.
- **io-ts**: Functional style that's less readable. Smaller ecosystem.
- **No validation**: Tempting for a file-based tool but state corruption from manual edits or merge conflicts will happen. Catch it at read time with clear errors, not at runtime with cryptic failures.

**State file format: JSON.** Not YAML, not TOML.
- JSON is native to Node.js (`JSON.parse`/`JSON.stringify`).
- `.branchos/` files are machine-managed, not hand-edited configs.
- No dependency needed for parsing.
- Git diffs are readable enough for JSON.

### Terminal UI & Output

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| chalk | ^5.3 | Terminal colors | The standard. ESM-only since v5. Lightweight, well-typed. | MEDIUM (v5.3+ confirmed) |
| @clack/prompts | ^0.9 | Interactive prompts (if needed) | Beautiful prompts with spinners. Used sparingly -- BranchOS is mostly non-interactive (slash command driven). Only needed for `branchos init` or confirmation dialogs. | LOW (version approximate, API may have changed) |

**Why not alternatives:**
- **picocolors**: Faster than chalk but API is less ergonomic for complex formatting. Performance difference is irrelevant for a CLI that runs git commands.
- **kleur**: Good but smaller ecosystem than chalk.
- **inquirer**: Heavy, over-featured for BranchOS's minimal interactive needs. @clack/prompts is lighter and prettier.
- **ora (spinners)**: @clack/prompts includes spinner functionality. If prompts aren't needed, ora is fine standalone for long operations like codebase mapping.

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^3.0 | Test runner | Native TypeScript support, fast, compatible with Jest API. Works with ESM out of the box. Built-in coverage via v8. | MEDIUM (v2.x confirmed, v3 likely by now) |

**Why not alternatives:**
- **Jest**: Requires ts-jest or SWC transformer for TypeScript. ESM support is still awkward. Vitest is the modern default.
- **node:test**: Built-in but limited assertion library, no watch mode sophistication, no coverage integration.

### Linting & Formatting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.0 | Linting | Flat config format (eslint.config.js). Use `@typescript-eslint/eslint-plugin`. | MEDIUM |
| Prettier | ^3.4 | Formatting | Opinionated, zero-config formatting. End formatting debates. | MEDIUM (v3.x confirmed) |

### Package Distribution

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| npm (registry) | n/a | Distribution | Project constraint. `npm install -g branchos`. | HIGH |
| changesets | ^2.27 | Version management | Manages changelogs and version bumps. Standard for npm packages. | MEDIUM |

## Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| glob (or fast-glob) | ^11.0 / ^3.3 | File pattern matching | Codebase mapping -- finding files by pattern | MEDIUM |
| ignore | ^6.0 | .gitignore parsing | Respecting .gitignore during codebase mapping | MEDIUM |
| minimatch | ^10.0 | Glob matching | Pattern matching for conflict detection | LOW |

## What NOT to Include

| Technology | Why Not |
|------------|---------|
| Database (SQLite, LevelDB) | File-based JSON state is the right model. `.branchos/` is committed to git. A database would be a separate artifact that can't be diffed, merged, or committed. |
| Express/Fastify/any server | No web server. CLI-only tool, no dashboard, no API. |
| React/Ink | Terminal UI framework is overkill. BranchOS outputs text and reads files. chalk + structured output is sufficient. |
| Prisma/Drizzle/any ORM | No database means no ORM. |
| dotenv | No environment-specific config. All config is in `.branchos/` committed to git. |
| Winston/Pino/any logger | `console.log` with chalk formatting is sufficient for a CLI. A logging framework adds complexity without value at this scale. |
| Monorepo tools (turborepo, nx) | Single package. No monorepo needed. |
| Docker | Developer tool installed via npm. No containerization needed. |

## Project Configuration

### package.json key fields

```json
{
  "name": "branchos",
  "type": "module",
  "bin": {
    "branchos": "./dist/cli.js"
  },
  "engines": {
    "node": ">=20"
  },
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

### tsconfig.json key settings

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  dts: true,
  shims: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

## Installation (for development)

```bash
# Core
npm install commander simple-git zod chalk

# Dev dependencies
npm install -D typescript tsup vitest eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser @changesets/cli

# Optional (add when needed)
npm install fast-glob ignore
```

## Alternatives Considered (Summary)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CLI Framework | Commander.js | oclif | Too heavy, plugin system unneeded |
| CLI Framework | Commander.js | yargs | Weaker TypeScript, sprawling API |
| Build | tsup | tsc only | No bundling, many output files |
| Build | tsup | esbuild direct | More manual config needed |
| Git | simple-git | isomorphic-git | Unnecessary pure-JS overhead |
| Git | simple-git | nodegit | Native module install issues |
| Validation | Zod | ajv (JSON Schema) | Verbose, separate type generation |
| Testing | Vitest | Jest | ESM/TS integration pain |
| Colors | chalk | picocolors | Marginal perf gain, worse API |
| State format | JSON | YAML/TOML | Extra parser, machine-managed files |

## Sources

- Training data (knowledge cutoff: May 2025). All version numbers should be verified against npm registry before project initialization.
- Commander.js: https://github.com/tj/commander.js
- simple-git: https://github.com/steveukx/git-js
- tsup: https://github.com/egoist/tsup
- Zod: https://github.com/colinhacks/zod
- Vitest: https://vitest.dev
- chalk: https://github.com/chalk/chalk

**Verification note:** WebSearch, Bash, and WebFetch were unavailable during this research session. All version numbers are based on training data (cutoff May 2025) and should be verified with `npm view <package> version` before initializing the project. Version ranges (^) provide buffer for minor updates.
