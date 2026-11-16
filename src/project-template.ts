export const has = <T extends string>(values: T[], value: T) =>
  values.includes(value);
export const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

export function tooling(frontend: boolean, mono: boolean) {
  const dependencies: Record<string, string> = {
    '@eslint/js': '^9.39.2',
    eslint: '^9.39.2',
    'eslint-config-prettier': '^10.1.8',
    'eslint-plugin-perfectionist': '^5.7.0',
    'eslint-plugin-unused-imports': '^4.4.1',
    globals: '^17.4.0',
    prettier: '^3.8.1',
    'typescript-eslint': '^8.65.0'
  };
  if (frontend)
    Object.assign(dependencies, {
      'eslint-plugin-svelte': '^3.22.0',
      'prettier-plugin-svelte': '^3.4.1',
      'prettier-plugin-tailwindcss': '^0.7.2',
      husky: '^9.1.7',
      'lint-staged': '^16.4.0'
    });
  if (mono) dependencies.turbo = '^2.4.2';
  return dependencies;
}

export function baseFiles(frontend: boolean, monorepo: boolean) {
  const config = `import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
${!monorepo ? `${frontend ? "import svelte from 'eslint-plugin-svelte';\n" : ''}import globals from 'globals';\n` : ''}
export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.svelte-kit/**', '**/logs/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  perfectionist.configs['recommended-natural'],
  prettier,${frontend && !monorepo ? "\n  ...(svelte.configs['flat/recommended'] ?? [])," : ''}
  {
    ${!monorepo ? `languageOptions: { globals: { ${frontend ? '...globals.browser, ' : ''}...globals.node } },\n    ` : ''}plugins: { 'unused-imports': unusedImports },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
);
`;
  return {
    '.gitignore':
      'node_modules/\ndist/\nbuild/\n.svelte-kit/\n.env\n.env.*\n!.env.example\nlogs/\n',
    '.prettierrc': json({
      singleQuote: true,
      trailingComma: 'none',
      ...(frontend
        ? { plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'] }
        : {})
    }),
    '.prettierignore':
      'node_modules\ndist\nbuild\n.svelte-kit\ncoverage\nlogs\n',
    'eslint.config.js': config
  };
}

export function frontendEslint() {
  return "import globals from 'globals';\nimport svelte from 'eslint-plugin-svelte';\nimport base from '../../eslint.config.js';\n\nexport default [...base, ...(svelte.configs['flat/recommended'] ?? []), { languageOptions: { globals: globals.browser } }];\n";
}
