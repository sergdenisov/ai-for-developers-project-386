import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';

import type { RouteHandlers } from './api/generated/fastify.gen.js';
import specification from './api/generated/openapi.json' with { type: 'json' };
import { addErrorHandling, apiError, validationFailed } from './errors.js';
import { createEventTypeStore } from './event-types.js';
import { owner } from './owner.js';
import { addResponseValidation } from './response-validation.js';

export type AppOptions = {
  logger?: boolean;
  /** Check every response against the contract; for tests. */
  validateResponses?: boolean;
};

export function buildApp({ logger = false, validateResponses = false }: AppOptions = {}) {
  const fastify = Fastify({
    logger,
    ajv: {
      customOptions: {
        // Report every invalid field at once, not only the first.
        allErrors: true,
        // Drop request fields the contract does not list. The default (`true`) drops them only where a schema says
        // `additionalProperties: false`, and the contract does not seal its objects.
        removeAdditional: 'all',
      },
    },
  });

  if (validateResponses) {
    addResponseValidation(fastify);
  }
  addErrorHandling(fastify);

  // In-memory store: every app instance starts empty.
  const eventTypes = createEventTypeStore();

  const serviceHandlers: RouteHandlers = {
    getOwner: async (_request, reply) => reply.code(200).send(owner),
    listEventTypes: async (_request, reply) => reply.code(200).send(eventTypes.list()),
    getEventType: async (request, reply) => {
      const eventType = eventTypes.get(request.params.id);
      return eventType === undefined
        ? reply.code(404).send(apiError('NOT_FOUND', 'Тип события не найден'))
        : reply.code(200).send(eventType);
    },
    createEventType: async (request, reply) => {
      const outcome = eventTypes.create(request.body);
      switch (outcome.kind) {
        case 'created':
          return reply.code(201).send(outcome.eventType);
        case 'invalid':
          return reply.code(400).send(validationFailed(outcome.fields));
        case 'taken':
          return reply.code(409).send(apiError(outcome.code, outcome.message));
      }
    },
  };

  // Routes and request validation come from the contract; the contract paths have no prefix.
  fastify.register(openapiGlue, { specification, serviceHandlers, prefix: '/api' });

  return fastify;
}
