#!/usr/bin/env node
import {
  cancel,
  intro,
  isCancel,
  multiselect,
  outro,
  select,
  spinner,
  text
} from '@clack/prompts';
import { resolve } from 'node:path';
import { generateProject } from './generate.js';
import type {
  BackendOption,
  FrontendOption,
  ProjectConfig,
  ProjectShape
} from './types.js';

function answer<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Setup cancelled.');
    process.exit(0);
  }
  return value as T;
}

async function main() {
  intro('Encore · project setup');

  const name = answer<string>(
    await text({
      message: 'What should the project be called?',
      placeholder: 'my-project',
      defaultValue: 'my-project',
      validate(value) {
        if (!value || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value.trim())) {
          return 'Use letters, numbers, dots, dashes, or underscores.';
        }
      }
    })
  );

  const shape = answer<ProjectShape>(
    await select<ProjectShape>({
      message: 'What are you building?',
      options: [
        {
          value: 'frontend',
          label: 'Frontend',
          hint: 'SvelteKit website or experience'
        },
        {
          value: 'backend',
          label: 'Backend',
          hint: 'API or standalone service'
        },
        {
          value: 'turbo',
          label: 'Frontend + server (Turbo)',
          hint: 'packages/frontend + packages/server'
        }
      ]
    })
  );

  let frontend: FrontendOption[] = [];
  let backend: BackendOption[] = [];

  if (shape !== 'backend') {
    frontend = answer<FrontendOption[]>(
      await multiselect<FrontendOption>({
        message: 'Add any frontend extras?',
        required: false,
        options: [
          { value: 'three', label: 'Three.js + Threlte', hint: '3D rendering' },
          { value: 'gsap', label: 'GSAP', hint: 'Animation' },
          { value: 'lenis', label: 'Lenis', hint: 'Smooth scrolling' }
        ]
      })
    );
  }

  if (shape !== 'frontend') {
    backend = answer<BackendOption[]>(
      await multiselect<BackendOption>({
        message: 'Choose backend capabilities',
        required: false,
        options: [
          { value: 'fastify', label: 'Fastify', hint: 'HTTP API' },
          {
            value: 'database',
            label: 'MySQL + Drizzle',
            hint: 'Includes schema, client, and migrations'
          },
          {
            value: 'websocket',
            label: 'Socket.IO',
            hint: 'Realtime server and frontend client when applicable'
          },
          {
            value: 'tcp',
            label: 'TCP bridge',
            hint: 'Receive and transform TCP messages'
          },
          {
            value: 'udp',
            label: 'UDP bridge',
            hint: 'Receive and transform UDP datagrams'
          }
        ]
      })
    );
  }

  const config: ProjectConfig = { name, shape, frontend, backend };
  const target = resolve(process.cwd(), name);
  const task = spinner();
  task.start(`Creating ${name}`);
  await generateProject(target, config);
  task.stop('Project files created');
  outro(`Next: cd ${name} && pnpm install`);
}

main().catch((error: unknown) => {
  cancel(error instanceof Error ? error.message : 'Project creation failed.');
  process.exitCode = 1;
});
