#!/usr/bin/env node
import {
  cancel,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts'
import { resolve } from 'node:path'

import type {
  BackendOption,
  FrontendOption,
  ProjectConfig,
  ProjectShape,
} from './types.js'

import { generateProject } from './generate.js'

function answer<T>(value: symbol | T): T {
  if (isCancel(value)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }
  return value as T
}

async function main() {
  intro('Encore · project setup')

  const name = answer<string>(
    await text({
      defaultValue: 'my-project',
      message: 'What should the project be called?',
      placeholder: 'my-project',
      validate(value) {
        if (!value || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value.trim())) {
          return 'Use letters, numbers, dots, dashes, or underscores.'
        }
      },
    }),
  ).trim()

  const shape = answer<ProjectShape>(
    await select<ProjectShape>({
      message: 'What are you building?',
      options: [
        {
          hint: 'SvelteKit website or experience',
          label: 'Frontend',
          value: 'frontend',
        },
        {
          hint: 'API or standalone service',
          label: 'Backend',
          value: 'backend',
        },
        {
          hint: 'packages/frontend + packages/server',
          label: 'Frontend + server (Turbo)',
          value: 'turbo',
        },
      ],
    }),
  )

  let frontend: FrontendOption[] = []
  let backend: BackendOption[] = []

  if (shape !== 'backend') {
    frontend = answer<FrontendOption[]>(
      await multiselect<FrontendOption>({
        message: 'Add any frontend extras?',
        options: [
          { hint: '3D rendering', label: 'Three.js + Threlte', value: 'three' },
          { hint: 'Animation', label: 'GSAP', value: 'gsap' },
          { hint: 'Smooth scrolling', label: 'Lenis', value: 'lenis' },
        ],
        required: false,
      }),
    )
  }

  if (shape !== 'frontend') {
    backend = answer<BackendOption[]>(
      await multiselect<BackendOption>({
        message: 'Choose backend capabilities',
        options: [
          { hint: 'HTTP API', label: 'Fastify', value: 'fastify' },
          {
            hint: 'Includes schema, client, and migrations',
            label: 'MySQL + Drizzle',
            value: 'database',
          },
          {
            hint: 'Realtime server and frontend client when applicable',
            label: 'Socket.IO',
            value: 'websocket',
          },
          {
            hint: 'Receive and transform TCP messages',
            label: 'TCP bridge',
            value: 'tcp',
          },
          {
            hint: 'Receive and transform UDP datagrams',
            label: 'UDP bridge',
            value: 'udp',
          },
        ],
        required: false,
      }),
    )
  }

  const config: ProjectConfig = { backend, frontend, name, shape }
  const target = resolve(process.cwd(), name)
  const task = spinner()
  task.start(`Creating ${name}`)
  await generateProject(target, config)
  task.stop('Project files created')
  outro(`Next: cd ${name} && pnpm install`)
}

main().catch((error: unknown) => {
  cancel(error instanceof Error ? error.message : 'Project creation failed.')
  process.exitCode = 1
})
