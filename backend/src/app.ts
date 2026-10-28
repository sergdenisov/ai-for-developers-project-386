import Fastify, { type FastifyServerOptions } from 'fastify';

export function buildApp(options: FastifyServerOptions = {}) {
  const fastify = Fastify(options);

  fastify.get('/', async () => {
    return { hello: 'world' };
  });

  return fastify;
}
