import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { ProjectConfig } from './types.js'

import { frontendFiles } from './frontend-template.js'
import {
  baseFiles,
  frontendEslint,
  has,
  json,
  tooling,
} from './project-template.js'
import { serverFiles } from './server-template.js'

export async function generateProject(target: string, config: ProjectConfig) {
  const monorepo = config.shape === 'turbo'
  const hasFrontend = config.shape !== 'backend'
  const hasBackend = config.shape !== 'frontend'
  const files: Record<string, string> = {
    ...baseFiles(hasFrontend, monorepo),
    'README.md': `# ${config.name}\n\nCreated with Encore.\n`,
  }
  const rootScripts: Record<string, string> = {
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    lint: 'eslint .',
    'lint:fix': 'eslint . --fix',
  }
  const rootDependencies: Record<string, string> = {}
  const rootDevDependencies: Record<string, string> = tooling(
    hasFrontend,
    monorepo,
    hasBackend,
  )
  if (hasFrontend) {
    rootScripts.prepare = 'husky'
    files['.husky/pre-commit'] = 'pnpm exec lint-staged\n'
  }

  if (monorepo) {
    Object.assign(files, {
      'packages/frontend/eslint.config.js': frontendEslint(),
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
      'turbo.json': json({
        $schema: 'https://turbo.build/schema.json',
        tasks: {
          build: {
            dependsOn: ['^build'],
            outputs: ['dist/**', '.svelte-kit/**'],
          },
          check: {},
          dev: { cache: false, persistent: true },
          lint: {},
        },
      }),
    })
    rootScripts.dev = 'turbo dev'
    rootScripts.build = 'turbo build'
    rootScripts.check = 'turbo check'
    rootScripts.lint = 'turbo lint'
    rootScripts['lint:fix'] = 'turbo lint -- --fix'
  }

  if (hasFrontend) {
    const base = monorepo ? 'packages/frontend/' : ''
    const frontend = frontendFiles(
      config.name,
      config.frontend,
      config.backend,
      base,
    )
    Object.assign(files, frontend.files)
    if (!monorepo) {
      Object.assign(rootDependencies, frontend.deps)
      Object.assign(rootDevDependencies, frontend.dev)
      Object.assign(rootScripts, {
        build: 'vite build',
        check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
        dev: 'vite dev --host',
        preview: 'vite preview',
      })
    }
  }

  if (hasBackend) {
    const location = monorepo ? 'turbo' : 'root'
    const server = serverFiles(config.name, config.backend, location)
    Object.assign(files, server.files)
    if (monorepo) {
      Object.assign(rootScripts, {
        'dev:frontend':
          'pnpm --filter @' +
          config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') +
          '/frontend dev',
        'dev:server':
          'pnpm --filter @' +
          config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') +
          '/server dev',
      })
    } else {
      Object.assign(rootDependencies, server.deps)
      Object.assign(rootDevDependencies, server.dev)
      Object.assign(rootScripts, {
        build: 'tsc -p tsconfig.json',
        check: 'tsc -p tsconfig.json --noEmit',
        dev: 'tsx watch src/index.ts',
        start: 'node dist/index.js',
      })
      if (has(config.backend, 'database'))
        Object.assign(rootScripts, {
          'db:generate': 'drizzle-kit generate',
          'db:push': 'drizzle-kit push',
        })
    }
  }

  const scripts = Object.fromEntries(
    Object.keys(rootScripts)
      .sort()
      .map((name) => [name, rootScripts[name]]),
  )

  if (!monorepo) {
    files['package.json'] = json({
      dependencies: rootDependencies,
      devDependencies: rootDevDependencies,
      engines: { node: '>=20.19.0' },
      name: config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
      packageManager: 'pnpm@10.17.1',
      private: true,
      scripts,
      type: 'module',
      ...(hasFrontend
        ? {
            'lint-staged': {
              '*.{css,html,json,md}': 'prettier --write',
              '*.{js,ts,svelte}': ['eslint --fix', 'prettier --write'],
            },
          }
        : {}),
    })
  } else {
    files['package.json'] = json({
      devDependencies: rootDevDependencies,
      engines: { node: '>=20.19.0' },
      name: config.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
      packageManager: 'pnpm@10.17.1',
      private: true,
      scripts,
      type: 'module',
      ...(hasFrontend
        ? {
            'lint-staged': {
              '*.{css,html,json,md}': 'prettier --write',
              'packages/frontend/**/*.{js,ts,svelte}': [
                'pnpm --dir packages/frontend exec eslint --fix',
                'prettier --write',
              ],
              'packages/server/**/*.{js,ts}': [
                'pnpm --dir packages/server exec eslint --fix',
                'prettier --write',
              ],
            },
          }
        : {}),
    })
  }

  try {
    await mkdir(target, { recursive: false })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      throw new Error(`The destination already exists: ${target}`, {
        cause: error,
      })
    }
    throw error
  }
  await writeFiles(target, files)
}

async function writeFiles(root: string, files: Record<string, string>) {
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, contents, 'utf8')
  }
}
