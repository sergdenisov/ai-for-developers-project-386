import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';

import type { RouteHandlers } from './api/generated/fastify.gen.js';
import specification from './api/generated/openapi.json' with { type: 'json' };
import { createBookingStore, type StoredBooking, trimGuest } from './bookings.js';
import { addErrorHandling, apiError, validationFailed } from './errors.js';
import { createEventTypeStore, trimEventTypeName } from './event-types.js';
import { formatOwnerInstant } from './owner-time.js';
import { owner } from './owner.js';
import { addResponseValidation } from './response-validation.js';
import { freeSlots, upcoming } from './slots.js';

export type AppOptions = {
  logger?: boolean;
  /** Check every response against the contract; for tests. */
  validateResponses?: boolean;
  /** The clock: the current moment. Tests pass a fixed one they can move; the default is the system clock. */
  now?: () => Date;
};

/** A Booking as the API gives it: moments in the Owner Time Zone. */
function bookingResource({ startsAt, endsAt, createdAt, ...booking }: StoredBooking) {
  return {
    ...booking,
    startsAt: formatOwnerInstant(startsAt),
    endsAt: formatOwnerInstant(endsAt),
    createdAt: formatOwnerInstant(createdAt),
  };
}

export function buildApp({
  logger = false,
  validateResponses = false,
  now = () => new Date(),
}: AppOptions = {}) {
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

  // The contract checks the length and format of these fields after trimming them, so they are trimmed first.
  const trimBody: Record<string, (body: unknown) => void> = {
    createEventType: trimEventTypeName,
    createBooking: trimGuest,
  };
  fastify.addHook('preValidation', async (request) => {
    // glue copies each operation's `operationId` into its route schema.
    const { operationId } = (request.routeOptions.schema ?? {}) as { operationId?: string };
    if (operationId !== undefined) {
      trimBody[operationId]?.(request.body);
    }
  });

  // In-memory stores: every app instance starts empty.
  const eventTypes = createEventTypeStore();
  const bookings = createBookingStore();

  const serviceHandlers: RouteHandlers = {
    getOwner: async (_request, reply) => reply.code(200).send(owner),
    listEventTypes: async (_request, reply) => reply.code(200).send(eventTypes.list()),
    getEventType: async (request, reply) => {
      const eventType = eventTypes.get(request.params.id);
      return eventType === undefined
        ? reply.code(404).send(apiError('NOT_FOUND', 'Тип события не найден'))
        : reply.code(200).send(eventType);
    },
    getFreeSlots: async (request, reply) => {
      const eventType = eventTypes.get(request.params.id);
      if (eventType === undefined) {
        return reply.code(404).send(apiError('NOT_FOUND', 'Тип события не найден'));
      }
      const { window, days } = freeSlots({
        now: now(),
        durationMinutes: eventType.durationMinutes,
        bookings: bookings.list(),
      });
      // A snapshot of the moment: a Slot may start or be booked right after it.
      return reply
        .header('cache-control', 'no-store')
        .code(200)
        .send({
          window,
          days: days.map(({ date, slots }) => ({
            date,
            slots: slots.map(({ startsAt, endsAt }) => ({
              startsAt: formatOwnerInstant(startsAt),
              endsAt: formatOwnerInstant(endsAt),
            })),
          })),
        });
    },
    createEventType: async (request, reply) => {
      const outcome = eventTypes.create(request.body);
      switch (outcome.kind) {
        case 'created':
          return reply.code(201).send(outcome.eventType);
        case 'conflict':
          return reply.code(409).send(apiError(outcome.code, outcome.message));
      }
    },
    listUpcoming: async (_request, reply) =>
      reply.code(200).send(upcoming(bookings.list(), now()).map(bookingResource)),
    createBooking: async (request, reply) => {
      const { eventTypeId, startsAt, guest } = request.body;
      const eventType = eventTypes.get(eventTypeId);
      if (eventType === undefined) {
        return reply.code(404).send(apiError('NOT_FOUND', 'Тип события не найден'));
      }
      // Checks the Slot and inserts the Booking synchronously: nothing else runs in between.
      const outcome = bookings.book({ eventType, startsAt: new Date(startsAt), guest, now: now() });
      switch (outcome.kind) {
        case 'booked':
          return reply.code(201).send(bookingResource(outcome.booking));
        case 'invalid':
          return reply.code(400).send(validationFailed(outcome.fields));
        case 'conflict':
          return reply.code(409).send(apiError(outcome.code, outcome.message));
      }
    },
  };

  // Routes and request validation come from the contract; the contract paths have no prefix.
  fastify.register(openapiGlue, { specification, serviceHandlers, prefix: '/api' });

  return fastify;
}
