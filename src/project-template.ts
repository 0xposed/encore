export const has = <T extends string>(values: T[], value: T) =>
  values.includes(value)
export const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

export function baseFiles(frontend: boolean, monorepo: boolean) {
  const config = `export { default } from '@0xposed/eslint-config/${frontend && !monorepo ? 'svelte' : 'node'}';\n`
  return {
    '.gitignore':
      'node_modules/\ndist/\nbuild/\n.svelte-kit/\n.env\n.env.*\n!.env.example\nlogs/\n',
    '.prettierignore':
      '**/node_modules\n**/dist\n**/build\n**/.svelte-kit\n**/.turbo\n**/coverage\n**/logs\npnpm-lock.yaml\n',
    'prettier.config.mjs': frontend
      ? `import config from '@0xposed/prettier-config/svelte';\n\nexport default { ...config, tailwindStylesheet: './${monorepo ? 'packages/frontend/' : ''}src/app.css' };\n`
      : "export { default } from '@0xposed/prettier-config';\n",
    'eslint.config.js': config,
  }
}

export function frontendEslint() {
  return "export { default } from '@0xposed/eslint-config/svelte';\n"
}

export function tooling(frontend: boolean, mono: boolean, backend: boolean) {
  const dependencies: Record<string, string> = {
    '@0xposed/eslint-config': 'latest',
    '@0xposed/prettier-config': 'latest',
    '@0xposed/tsconfig': 'latest',
    eslint: '^9.39.2',
    prettier: '^3.8.1',
    ...(backend ? { typescript: '^5.9.3' } : {}),
  }
  if (frontend)
    Object.assign(dependencies, {
      husky: '^9.1.7',
      'lint-staged': '^16.4.0',
    })
  if (mono) dependencies.turbo = '^2.4.2'
  return dependencies
}
