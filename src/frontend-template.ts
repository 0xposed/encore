import type { BackendOption, FrontendOption } from './types.js'

import { has, json } from './project-template.js'

export function frontendFiles(
  name: string,
  extras: FrontendOption[],
  backend: BackendOption[],
  base = '',
) {
  const packageName = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  const deps: Record<string, string> = {
    clsx: '^2.1.1',
    'tailwind-merge': '^3.3.1',
  }
  const dev: Record<string, string> = {
    '@sveltejs/adapter-auto': '^7.0.1',
    '@sveltejs/kit': '^2.50.2',
    '@sveltejs/vite-plugin-svelte': '^6.2.4',
    '@tailwindcss/vite': '^4.1.18',
    svelte: '^5.49.2',
    'svelte-check': '^4.3.6',
    tailwindcss: '^4.1.18',
    tslib: '^2.8.1',
    typescript: '^5.9.3',
    vite: '^7.3.1',
  }
  if (has(extras, 'three')) {
    Object.assign(deps, {
      '@threlte/core': '^8.5.5',
      '@threlte/extras': '^9.14.1',
      three: '^0.183.2',
    })
    dev['@types/three'] = '^0.183.1'
  }
  if (has(extras, 'gsap')) deps.gsap = '^3.14.2'
  if (has(extras, 'lenis')) deps.lenis = '^1.3.21'
  if (has(backend, 'websocket')) deps['socket.io-client'] = '^4.8.1'

  const files: Record<string, string> = {
    [`${base}package.json`]: json({
      dependencies: deps,
      devDependencies: dev,
      engines: { node: '>=20.19.0' },
      name: `@${packageName}/frontend`,
      private: true,
      scripts: {
        build: 'vite build',
        check: 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
        dev: 'vite dev --host',
        format: 'prettier --write .',
        lint: 'eslint .',
        preview: 'vite preview',
      },
      type: 'module',
    }),
    [`${base}src/app.css`]:
      '@import "tailwindcss";\n\n:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color-scheme: dark; }\nbody { margin: 0; min-height: 100vh; background: #0b0c0d; color: #f3f0e8; }\n',
    [`${base}src/app.html`]:
      '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>%sveltekit.head%</head><body data-sveltekit-preload-data="hover"><div style="display: contents">%sveltekit.body%</div></body></html>\n',
    [`${base}src/lib/utils/cn.ts`]:
      "import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nexport function cn(...values: ClassValue[]) {\n  return twMerge(clsx(values));\n}\n",
    [`${base}src/routes/+layout.svelte`]:
      '<script lang="ts">\n  import "../app.css";\n  let { children } = $props();\n</script>\n\n{@render children()}\n',
    [`${base}src/routes/+page.svelte`]: `<svelte:head><title>${name}</title><meta name="description" content="A project built with Encore." /></svelte:head>\n\n<main class="grid min-h-screen place-items-center p-8 text-center"><div><p class="text-sm uppercase tracking-[0.2em] text-lime-300">Encore starter</p><h1 class="mt-4 text-6xl font-semibold tracking-tight">${name}</h1><p class="mt-4 text-white/60">Your project starts here.</p></div></main>\n`,
    [`${base}svelte.config.js`]:
      "import adapter from '@sveltejs/adapter-auto';\nimport { vitePreprocess } from '@sveltejs/vite-plugin-svelte';\n\nexport default { preprocess: vitePreprocess(), kit: { adapter: adapter() } };\n",
    [`${base}tsconfig.json`]:
      '{"extends":["./.svelte-kit/tsconfig.json","@0xposed/tsconfig/svelte"],"compilerOptions":{"allowJs":true,"checkJs":true}}\n',
    [`${base}vite.config.ts`]:
      "import tailwindcss from '@tailwindcss/vite';\nimport { sveltekit } from '@sveltejs/kit/vite';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({ plugins: [tailwindcss(), sveltekit()] });\n",
  }

  if (has(backend, 'websocket'))
    files[`${base}src/lib/socket.ts`] =
      "import { io } from 'socket.io-client';\n\nexport const socket = io(import.meta.env.VITE_API_URL ?? 'http://localhost:3001', { autoConnect: false });\n"
  return { deps, dev, files }
}
