<h1 align="center">Encore</h1>

<p align="center">An interactive CLI for SvelteKit, Node.js, and Turbo project starters.</p>

## Project shapes

Choose a project shape, then select only the extras it needs:

| Shape             | Starter                                                        | Optional capabilities                                    |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Frontend          | SvelteKit, Svelte 5, TypeScript, and Tailwind                  | Three.js + Threlte, GSAP, Lenis                          |
| Backend           | TypeScript service with Winston logging                        | Fastify, MySQL + Drizzle, Socket.IO, TCP and UDP bridges |
| Frontend + server | Turbo workspace with `packages/frontend` and `packages/server` | Frontend and backend capabilities above                  |

The database option includes the client, schema, and migration setup. TCP and UDP bridges provide a starting point for receiving and transforming messages, then publishing events through Socket.IO when selected.

## Run locally

```sh
pnpm install
pnpm dev
```

Follow the prompts to name your project and choose its capabilities. Encore creates a new directory relative to your current working directory and refuses existing destinations without overwriting their contents.

Then enter the generated project:

```sh
cd my-project
pnpm install
pnpm dev
```

Replace `my-project` with the name you chose.

## Build and use

```sh
pnpm build
node dist/cli.js
```

Generated projects use pnpm and are kept intentionally small.

Every generated project includes `pnpm check`. For Turbo projects, it checks both the frontend and server; backend checks run TypeScript without emitting build files.

## Development checks

```sh
pnpm check
pnpm test
pnpm build
```

The tests generate temporary projects for all three shapes and check their verification scripts and destination handling. They do not install or build generated projects.
