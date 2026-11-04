import { extname } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

/**
 * Serves the built frontend from the same port as the API. The frontend's router owns its pages, so any other `GET`
 * answers with `index.html`; unknown API routes and missing files stay `404 NOT_FOUND`.
 */
export function serveFrontend(fastify: FastifyInstance, frontendDir: string) {
  fastify.register(fastifyStatic, { root: frontendDir, wildcard: false });

  fastify.get('/*', async (request, reply) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    const isPage = !pathname.startsWith('/api/') && extname(pathname) === '';
    return isPage ? reply.sendFile('index.html') : reply.callNotFound();
  });
}
