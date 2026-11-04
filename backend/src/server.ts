import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { buildApp } from './app.js';

// `--validate-responses` checks every response against the contract, as the API tests do; the browser tests start
// the built server with it. It only adds the check and changes nothing else. Off by default.
// `--frontend-dir` is the built frontend to serve next to the API, as the Docker image and the browser tests do.
const { values } = parseArgs({
  options: {
    'validate-responses': { type: 'boolean', default: false },
    'frontend-dir': { type: 'string' },
  },
});

const frontendDir = values['frontend-dir'];

const fastify = buildApp({
  logger: true,
  validateResponses: values['validate-responses'],
  frontendDir: frontendDir === undefined ? undefined : resolve(frontendDir),
});

// In a container the server is PID 1, for which the default action of these signals does nothing.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void fastify.close());
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await fastify.listen({ port, host });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
