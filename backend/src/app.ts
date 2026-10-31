import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';

import type { EventType } from './api/generated/index.js';
import type { RouteHandlers } from './api/generated/fastify.gen.js';
import specification from './api/generated/openapi.json' with { type: 'json' };
import { addResponseValidation } from './response-validation.js';

export type AppOptions = {
  logger?: boolean;
  /** Check every response against the contract; for tests. */
  validateResponses?: boolean;
};

export function buildApp({ logger = false, validateResponses = false }: AppOptions = {}) {
  const fastify = Fastify({ logger });

  if (validateResponses) {
    addResponseValidation(fastify);
  }

  // In-memory store: every app instance starts empty.
  const eventTypes: EventType[] = [];

  const serviceHandlers: RouteHandlers = {
    listEventTypes: async (_request, reply) => reply.code(200).send(eventTypes),
  };

  // Routes and request validation come from the contract; the contract paths have no prefix.
  fastify.register(openapiGlue, { specification, serviceHandlers, prefix: '/api' });

  return fastify;
}
