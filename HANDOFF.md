# Encore handoff

## Goal

Encore is a small interactive CLI for creating projects from the patterns used in this workspace. Keep it simple: one frontend, one backend, or a Turbo workspace with `packages/frontend` and `packages/server`. There is no separate non-Turbo full-stack mode.

## Philosophy

- Start with the smallest useful project, not a general-purpose framework or a pile of packages.
- Ask for capabilities, not individual implementation layers. Choosing **database** means MySQL, Drizzle, client, schema, and migration setup together; choosing **WebSocket** means Socket.IO. Logging is a baseline, not a checkbox.
- A frontend-only or backend-only project stays flat. Use Turbo only when both frontend and server are needed; keep that workspace to two packages unless a real project later needs more.
- Treat hardware/protocol integrations as optional edges. TCP and UDP adapters receive data, leave a small place to transform it, then publish events. Project-specific parsing belongs in the generated project, not in Encore.
- Keep familiar tooling consistent without copying every dependency from old projects. Three.js/Threlte, GSAP, and Lenis are independent opt-ins; Redis, serial USB, and a separate validation layer are not defaults.
- Prefer understandable files and reversible changes over elaborate template abstraction. Encore should be easy to inspect and adjust after generation.

## Projects and patterns used as references

- `../renault-solutrans`: the UDP-to-Socket.IO bridge and a Turbo frontend/server project. Its protocol-specific message parsing is **not** part of the generic template.
- `../dior-vivatech`: recent SvelteKit/Tailwind setup, root lint/format configuration, Socket.IO, and contextual Winston logging with daily rotation. Encore takes the logging pattern, not the entire application structure.
- `../ysl-lovestore`: MySQL + Drizzle pairing and database scripts. Encore makes these one database capability instead of separate prompts.
- `../sveltekit-starter`: basic SvelteKit tooling, class utilities, ESLint/Prettier, Perfectionist, and unused-import checks.
- `../threlte-starter` and `../0RIP`: evidence for keeping 3D and motion libraries available but optional.
- `../led-controller`: the straightforward `packages/frontend` + `packages/server` naming used for the Turbo shape; Encore does not inherit its older React/Lerna stack.

These are design references, not copied templates. In particular, Fastify is the chosen modern HTTP option even though several reference servers use Koa.

## Current implementation

- `src/cli.ts` uses Clack to ask for a name, project shape, and relevant optional capabilities.
- `src/generate.ts` assembles and writes the starter files. It refuses to generate into an existing destination.
- `src/project-template.ts` owns shared lint/format tooling and small template helpers; `src/frontend-template.ts` and `src/server-template.ts` own their respective generated files.
- Frontend: SvelteKit/Svelte 5, TypeScript, Vite, Tailwind, `clsx`/`tailwind-merge`, ESLint, Prettier, Perfectionist, and a Husky/lint-staged hook. Three.js/Threlte, GSAP, and Lenis are optional frontend choices.
- Backend: Fastify, MySQL + Drizzle, Socket.IO, TCP bridge, and UDP bridge are independently selectable. The database choice includes its client, schema, and Drizzle configuration. Logging is always included, even for a bridge-only backend.
- Turbo uses shared root lint/format tooling with package-specific ESLint configs.
- Generated projects use pnpm. Redis and serial USB are intentionally excluded.

## Run and verify

```sh
pnpm install
pnpm dev
pnpm check
pnpm build
node dist/cli.js
```

The CLI itself passed `pnpm check` and `pnpm build`. Generation was smoke-tested for frontend-only, UDP-only backend, and Turbo with all capabilities. The template-module refactor was also checked against byte-for-byte output hashes for frontend-only, UDP-only backend, all-capabilities backend, and all-capabilities Turbo projects. Those generated projects were inspected, but their dependencies were **not** installed and their own checks were **not** run. Treat that as the main remaining verification step before publishing or relying on every combination.

## Notes for the next pass

- Test generated projects with fresh installs, especially the Turbo and database combinations.
- Review the generated runtime bridge transformation against a real TCP/UDP payload when one is available; the current transformer is a generic starting point, not Renault-specific protocol logic.
- Keep changes localized and avoid expanding Encore into a framework or template factory.
