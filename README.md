# Encore

Encore is a small interactive CLI that creates project starters from the stack and patterns used across my projects.

## Run locally

```sh
pnpm install
pnpm dev
```

The CLI asks for a project shape, then only the relevant extras. Backend projects always include the shared Winston logger. The database choice bundles MySQL and Drizzle; Socket.IO is one realtime choice; TCP and UDP bridges can receive data, transform it, and emit Socket.IO events.

## Build and use

```sh
pnpm build
node dist/cli.js
```

Generated projects use pnpm and are kept intentionally small. A Turbo project uses `packages/frontend` and `packages/server`.
