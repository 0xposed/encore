import type { BackendOption } from './types.js'

import { has, json } from './project-template.js'

export function serverFiles(
  name: string,
  options: BackendOption[],
  location: 'root' | 'turbo',
) {
  const packageName = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')
  const src = location === 'turbo' ? 'packages/server/src/' : 'src/'
  const deps: Record<string, string> = {
    chalk: '^5.6.2',
    'pretty-error': '^4.0.0',
    winston: '^3.17.0',
    'winston-daily-rotate-file': '^5.0.0',
  }
  const dev: Record<string, string> = {
    '@types/node': '^22.19.9',
    tsx: '^4.19.3',
    typescript: '^5.9.3',
  }
  if (has(options, 'fastify')) deps.fastify = '^5.2.0'
  if (has(options, 'database')) {
    Object.assign(deps, {
      dotenv: '^17.2.3',
      'drizzle-orm': '^0.44.7',
      mysql2: '^3.12.0',
    })
    dev['drizzle-kit'] = '^0.30.6'
  }
  if (has(options, 'websocket')) deps['socket.io'] = '^4.8.1'

  const files: Record<string, string> = {
    [`${src}index.ts`]: `${has(options, 'fastify') ? "import Fastify from 'fastify';\n" : ''}${has(options, 'websocket') ? "import { Server as SocketServer } from 'socket.io';\n" : ''}${has(options, 'websocket') && !has(options, 'fastify') ? "import { createServer } from 'node:http';\n" : ''}${has(options, 'tcp') ? "import { startTcpBridge } from './bridges/tcp.js';\n" : ''}${has(options, 'udp') ? "import { startUdpBridge } from './bridges/udp.js';\n" : ''}import { serverLogger } from './logging/index.js';

async function main() {
${has(options, 'fastify') ? "  const app = Fastify({ logger: false });\n  app.get('/health', async () => ({ ok: true }));\n" : ''}${has(options, 'websocket') && has(options, 'fastify') ? '  const io = new SocketServer(app.server, { cors: { origin: true } });\n' : ''}${has(options, 'websocket') && !has(options, 'fastify') ? '  const server = createServer();\n  const io = new SocketServer(server, { cors: { origin: true } });\n' : ''}${has(options, 'websocket') ? "  io.on('connection', (socket) => serverLogger.info('Socket.IO client connected: ' + socket.id));\n  const publish = (event: string, payload: unknown) => io.emit(event, payload);\n" : "  const publish = (event: string, payload: unknown) => serverLogger.info(event + ': ' + JSON.stringify(payload));\n"}${has(options, 'tcp') ? '  startTcpBridge(publish);\n' : ''}${has(options, 'udp') ? '  startUdpBridge(publish);\n' : ''}${has(options, 'fastify') ? "  await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3001) });\n  serverLogger.info('Fastify listening on port ' + (process.env.PORT ?? 3001));\n" : ''}${has(options, 'websocket') && !has(options, 'fastify') ? "  server.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () => serverLogger.info('Socket.IO listening on port ' + (process.env.PORT ?? 3001)));\n" : ''}}

main().catch((error: unknown) => {
  serverLogger.error(error instanceof Error ? serverLogger.pretty(error) : String(error));
  process.exitCode = 1;
});
`,
    [`${src}logging/index.ts`]: `import chalk from 'chalk';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import PrettyError from 'pretty-error';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDirectory = join(process.cwd(), 'logs');
mkdirSync(logDirectory, { recursive: true });
const prettyError = new PrettyError();
prettyError.skipNodeFiles();

export function createLogger(context: string) {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    defaultMeta: { context },
    transports: [new DailyRotateFile({ dirname: join(logDirectory, context.toLowerCase()), filename: '%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d' })]
  });
  const output = (level: string, color: (message: string) => string, message: string) => {
    logger.log({ level: level.toLowerCase(), message });
    console.log(chalk.gray(new Date().toISOString()), color(level), chalk.blue('[' + context + ']'), message);
  };
  return {
    info(message: string) { output('INFO', chalk.green, message); },
    warn(message: string) { output('WARN', chalk.yellow, message); },
    error(message: string) { output('ERROR', chalk.red, message); },
    pretty(error: Error) { return prettyError.render(error); }
  };
}

export const serverLogger = createLogger('SERVER');
${has(options, 'database') ? "export const databaseLogger = createLogger('DATABASE');\n" : ''}${has(options, 'websocket') ? "export const websocketLogger = createLogger('WEBSOCKET');\n" : ''}${has(options, 'tcp') ? "export const tcpLogger = createLogger('TCP');\n" : ''}${has(options, 'udp') ? "export const udpLogger = createLogger('UDP');\n" : ''}`,
  }

  if (has(options, 'websocket')) {
    files[`${src}index.ts`] = files[`${src}index.ts`]
      .replace(
        'import { serverLogger }',
        'import { serverLogger, websocketLogger }',
      )
      .replace(
        "serverLogger.info('Socket.IO client",
        "websocketLogger.info('Socket.IO client",
      )
  }
  files[`${src}pretty-error.d.ts`] =
    "declare module 'pretty-error' {\n  export default class PrettyError {\n    skipNodeFiles(): void;\n    render(error: Error): string;\n  }\n}\n"

  if (has(options, 'tcp') || has(options, 'udp'))
    files[`${src}bridges/transform.ts`] =
      `export type Publish = (event: string, payload: unknown) => void;

export function transform(protocol: 'tcp' | 'udp', message: string, remote: string) {
  return { protocol, message, remote, receivedAt: new Date().toISOString() };
}
`
  if (has(options, 'tcp'))
    files[`${src}bridges/tcp.ts`] = `import { createServer } from 'node:net';
import { tcpLogger } from '../logging/index.js';
import { transform, type Publish } from './transform.js';

export function startTcpBridge(publish: Publish) {
  const server = createServer((socket) => {
    const remote = (socket.remoteAddress ?? 'unknown') + ':' + (socket.remotePort ?? 0);
    tcpLogger.info('Client connected: ' + remote);
    let pending = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      const lines = (pending + chunk).split(/\\r?\\n/);
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        tcpLogger.info('Received message from ' + remote);
        publish('bridge.tcp.message', transform('tcp', line, remote));
      }
    });
    socket.on('error', (error) => tcpLogger.error(error.message));
    socket.on('close', () => tcpLogger.info('Client disconnected: ' + remote));
  });
  const port = Number(process.env.TCP_PORT ?? 4000);
  server.listen(port, '0.0.0.0', () => tcpLogger.info('TCP bridge listening on ' + port));
  return server;
}
`
  if (has(options, 'udp'))
    files[`${src}bridges/udp.ts`] = `import { createSocket } from 'node:dgram';
import { udpLogger } from '../logging/index.js';
import { transform, type Publish } from './transform.js';

export function startUdpBridge(publish: Publish) {
  const socket = createSocket('udp4');
  socket.on('message', (data, remote) => {
    const address = remote.address + ':' + remote.port;
    udpLogger.info('Received datagram from ' + address + ' (' + data.length + ' bytes)');
    publish('bridge.udp.message', transform('udp', data.toString('utf8'), address));
  });
  socket.on('error', (error) => udpLogger.error(error.message));
  const port = Number(process.env.UDP_PORT ?? 5000);
  socket.bind(port, '0.0.0.0', () => udpLogger.info('UDP bridge listening on ' + port));
  return socket;
}
`
  if (has(options, 'database')) {
    files[`${src}database/client.ts`] = `import 'dotenv/config';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema.js';
import { databaseLogger } from '../logging/index.js';

export const pool = mysql.createPool(process.env.DATABASE_URL ?? 'mysql://root:password@localhost:3306/app');
pool.on('connection', () => databaseLogger.info('MySQL connection established'));
export const db = drizzle(pool, { schema, mode: 'default' });
`
    files[`${src}database/schema.ts`] =
      `import { int, mysqlTable, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const example = mysqlTable('example', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
`
  }

  if (location === 'turbo') {
    files['packages/server/package.json'] = json({
      dependencies: deps,
      devDependencies: dev,
      name: `@${packageName}/server`,
      private: true,
      scripts: {
        build: 'tsc -p tsconfig.json',
        check: 'tsc -p tsconfig.json --noEmit',
        ...(has(options, 'database')
          ? {
              'db:generate': 'drizzle-kit generate',
              'db:push': 'drizzle-kit push',
            }
          : {}),
        dev: 'tsx watch src/index.ts',
        format: 'prettier --write .',
        lint: 'eslint .',
        start: 'node dist/index.js',
      },
      type: 'module',
    })
    files['packages/server/tsconfig.json'] =
      '{"extends":"@0xposed/tsconfig/node","compilerOptions":{"rootDir":"src","outDir":"dist"},"include":["src/**/*.ts"]}\n'
    files['packages/server/eslint.config.js'] =
      "export { default } from '@0xposed/eslint-config/node';\n"
    if (has(options, 'database')) {
      files['packages/server/drizzle.config.ts'] = drizzleConfig(
        './src/database/schema.ts',
      )
      files['packages/server/.env.example'] =
        'DATABASE_URL=mysql://root:password@localhost:3306/app\n'
    }
  } else {
    files['tsconfig.json'] =
      '{"extends":"@0xposed/tsconfig/node","compilerOptions":{"rootDir":"src","outDir":"dist"},"include":["src/**/*.ts"]}\n'
    if (has(options, 'database')) {
      files['drizzle.config.ts'] = drizzleConfig('./src/database/schema.ts')
      files['.env.example'] =
        'DATABASE_URL=mysql://root:password@localhost:3306/app\n'
    }
  }
  return { deps, dev, files }
}

function drizzleConfig(schema: string) {
  return `import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({ schema: '${schema}', out: './drizzle', dialect: 'mysql', dbCredentials: { url: process.env.DATABASE_URL ?? '' } });
`
}
