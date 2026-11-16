import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ProjectConfig } from './types.js';
import { frontendFiles } from './frontend-template.js';
import { serverFiles } from './server-template.js';
import {
  baseFiles,
  frontendEslint,
  has,
  json,
  tooling
} from './project-template.js';

async function writeFiles(root: string, files: Record<string, string>) {
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }
}

export async function generateProject(target: string, config: ProjectConfig) {
  try {
    await access(target);
    throw new Error(`The destination already exists: ${target}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The destination'))
      throw error;
  }

  const monorepo = config.shape === 'turbo';
  const hasFrontend = config.shape !== 'backend';
  const hasBackend = config.shape !== 'frontend';
  const files: Record<string, string> = {
    ...baseFiles(hasFrontend, monorepo),
    'README.md': `# ${config.name}\n\nCreated with Encore.\n`
  };
  const rootScripts: Record<string, string> = {
    lint: 'eslint .',
    format: 'prettier --write .'
  };
  const rootDependencies: Record<string, string> = {};
  const rootDevDependencies: Record<string, string> = tooling(
    hasFrontend,
    monorepo
  );
  if (hasFrontend) {
    rootScripts.prepare = 'husky';
    files['.husky/pre-commit'] = 'pnpm exec lint-staged\n';
  }

  if (monorepo) {
    Object.assign(files, {
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
      'turbo.json': json({
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**', '.svelte-kit/**']
          },
          dev: { cache: false, persistent: true },
          lint: {},
          check: {}
        }
      }),
      'packages/frontend/eslint.config.js': frontendEslint()
    });
    rootScripts.dev = 'turbo dev';
    rootScripts.build = 'turbo build';
  }

  if (hasFrontend) {
    const base = monorepo ? 'packages/frontend/' : '';
    const frontend = frontendFiles(
      config.name,
      config.frontend,
      config.backend,
      base
    );
    Object.assign(files, frontend.files);
    if (monorepo) {
      Object.assign(rootScripts, {
        check:
          'pnpm --filter @' +
          config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') +
          '/frontend check'
      });
    } else {
      Object.assign(rootDependencies, frontend.deps);
      Object.assign(rootDevDependencies, frontend.dev);
      Object.assign(rootScripts, {
        dev: 'vite dev --host',
        build: 'vite build',
        preview: 'vite preview',
        check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json'
      });
    }
  }

  if (hasBackend) {
    const location = monorepo ? 'turbo' : 'root';
    const server = serverFiles(config.name, config.backend, location);
    Object.assign(files, server.files);
    if (monorepo) {
      Object.assign(rootScripts, {
        'dev:frontend':
          'pnpm --filter @' +
          config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') +
          '/frontend dev',
        'dev:server':
          'pnpm --filter @' +
          config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') +
          '/server dev'
      });
    } else {
      Object.assign(rootDependencies, server.deps);
      Object.assign(rootDevDependencies, server.dev);
      Object.assign(rootScripts, {
        dev: 'tsx watch src/index.ts',
        build: 'tsc -p tsconfig.json',
        start: 'node dist/index.js'
      });
      if (has(config.backend, 'database'))
        Object.assign(rootScripts, {
          'db:generate': 'drizzle-kit generate',
          'db:push': 'drizzle-kit push'
        });
    }
  }

  if (!monorepo) {
    files['package.json'] = json({
      name: config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.17.1',
      scripts: rootScripts,
      dependencies: rootDependencies,
      devDependencies: rootDevDependencies,
      ...(hasFrontend
        ? {
            'lint-staged': {
              '*.{js,ts,svelte}': ['eslint --fix', 'prettier --write'],
              '*.{css,html,json,md}': 'prettier --write'
            }
          }
        : {})
    });
  } else {
    files['package.json'] = json({
      name: config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
      private: true,
      type: 'module',
      packageManager: 'pnpm@10.17.1',
      scripts: rootScripts,
      devDependencies: rootDevDependencies,
      ...(hasFrontend
        ? {
            'lint-staged': {
              '*.{js,ts,svelte}': ['eslint --fix', 'prettier --write'],
              '*.{css,html,json,md}': 'prettier --write'
            }
          }
        : {})
    });
  }

  await mkdir(target, { recursive: false });
  await writeFiles(target, files);
}
