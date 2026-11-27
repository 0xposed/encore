import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import type { ProjectConfig, ProjectShape } from '../src/types.js'

import { generateProject } from '../src/generate.js'

function config(shape: ProjectShape): ProjectConfig {
  return {
    backend: [],
    frontend: [],
    name: 'example',
    shape,
  }
}

for (const shape of ['frontend', 'backend', 'turbo'] as const) {
  test(`${shape} includes checks for every generated package`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'encore-test-'))
    t.after(() => rm(root, { force: true, recursive: true }))
    const target = join(root, 'example')
    await generateProject(target, config(shape))
    const manifest = JSON.parse(
      await readFile(join(target, 'package.json'), 'utf8'),
    )
    assert.equal(
      manifest.scripts.lint,
      shape === 'turbo' ? 'turbo lint' : 'eslint .',
    )
    assert.equal(
      manifest.scripts['lint:fix'],
      shape === 'turbo' ? 'turbo lint -- --fix' : 'eslint . --fix',
    )
    assert.equal(manifest.scripts['format:check'], 'prettier --check .')
    const prettier = await readFile(
      join(target, 'prettier.config.mjs'),
      'utf8',
    )
    assert.match(prettier, /@0xposed\/prettier-config/)
    const tsconfigPath =
      shape === 'turbo'
        ? 'packages/server/tsconfig.json'
        : 'tsconfig.json'
    if (shape !== 'frontend') {
      const tsconfig = JSON.parse(
        await readFile(join(target, tsconfigPath), 'utf8'),
      )
      assert.equal(tsconfig.extends, '@0xposed/tsconfig/node')
    } else {
      const tsconfig = JSON.parse(
        await readFile(join(target, tsconfigPath), 'utf8'),
      )
      assert.deepEqual(tsconfig.extends, [
        './.svelte-kit/tsconfig.json',
        '@0xposed/tsconfig/svelte',
      ])
    }
    if (shape !== 'backend') {
      assert.match(prettier, /@0xposed\/prettier-config\/svelte/)
      const eslintPath =
        shape === 'turbo'
          ? 'packages/frontend/eslint.config.js'
          : 'eslint.config.js'
      const eslint = await readFile(join(target, eslintPath), 'utf8')
      assert.match(eslint, /@0xposed\/eslint-config\/svelte/)
    }

    if (shape === 'turbo') {
      assert.equal(
        manifest['lint-staged']['packages/frontend/**/*.{js,ts,svelte}'][0],
        'pnpm --dir packages/frontend exec eslint --fix',
      )
      assert.equal(manifest.scripts.check, 'turbo check')
      const turbo = JSON.parse(
        await readFile(join(target, 'turbo.json'), 'utf8'),
      )
      assert.ok('check' in turbo.tasks)
      for (const name of ['frontend', 'server']) {
        const child = JSON.parse(
          await readFile(
            join(target, 'packages', name, 'package.json'),
            'utf8',
          ),
        )
        assert.equal(
          child.scripts.check,
          name === 'server'
            ? 'tsc -p tsconfig.json --noEmit'
            : 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
        )
      }
    } else {
      assert.equal(
        manifest.scripts.check,
        shape === 'backend'
          ? 'tsc -p tsconfig.json --noEmit'
          : 'svelte-kit sync && svelte-check --tsconfig ./tsconfig.json',
      )
    }
  })
}

test('existing destinations are refused without changing their contents', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'encore-test-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  const target = join(root, 'example')
  await mkdir(target)
  await writeFile(join(target, 'keep.txt'), 'keep me')

  await assert.rejects(
    generateProject(target, config('backend')),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, `The destination already exists: ${target}`)
      assert.ok(error.cause instanceof Error && 'code' in error.cause)
      assert.equal(error.cause.code, 'EEXIST')
      return true
    },
  )
  assert.deepEqual(await readdir(target), ['keep.txt'])
  assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep me')
})

test('filesystem failures retain their original error code', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'encore-test-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  await assert.rejects(
    generateProject(join(root, 'missing', 'example'), config('backend')),
    { code: 'ENOENT' },
  )
  assert.deepEqual(await readdir(root), [])
})
