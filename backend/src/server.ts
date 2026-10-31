import { parseArgs } from 'node:util';

import { buildApp } from './app.js';

// `--validate-responses` checks every response against the contract, as the API tests do; the browser tests start
// the built server with it. It only adds the check and changes nothing else. Off by default.
const { values } = parseArgs({
  options: { 'validate-responses': { type: 'boolean', default: false } },
});

const fastify = buildApp({ logger: true, validateResponses: values['validate-responses'] });

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await fastify.listen({ port, host });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
