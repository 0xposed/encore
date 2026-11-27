<h1 align="center">Encore</h1>

<p align="center">Generate SvelteKit, Node.js, and Turbo project starters.</p>

<p align="center">
  <a aria-label="npm version" href="https://www.npmjs.com/package/encore-cli">
    <img alt="npm version" src="https://img.shields.io/npm/v/encore-cli?style=flat&color=000&logoColor=000">
  </a>
  <a aria-label="License" href="https://github.com/0xposed/encore/blob/master/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/0xposed/encore?style=flat&color=000000">
  </a>
</p>

## Use

```sh
npx encore-cli
```

Encore prompts for a frontend, backend, or Turbo workspace, then asks which optional capabilities to include. It creates the project in a new directory under your current working directory.

## Included starters

- **Frontend:** SvelteKit, TypeScript, Tailwind CSS; optional Three.js + Threlte, GSAP, and Lenis.
- **Backend:** TypeScript with Winston logging; optional Fastify, MySQL + Drizzle, Socket.IO, and TCP/UDP bridges.
- **Turbo:** `packages/frontend` and `packages/server`, with checks for both packages.

## Develop

```sh
pnpm install
pnpm check
pnpm test
pnpm build
```

## Release

Add a release note with `pnpm changeset`. On the release branch, run `pnpm version-packages`, commit the version and changelog updates, then publish with `pnpm release`.
