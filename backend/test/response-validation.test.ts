import Fastify from 'fastify';
import openapiGlue from 'fastify-openapi-glue';
import { afterEach, expect, test } from 'vitest';

import type { RouteHandlers } from '../src/api/generated/fastify.gen.js';
import specification from '../src/api/generated/openapi.json' with { type: 'json' };
import { addResponseValidation } from '../src/response-validation.js';
import { listen, type RunningApp } from './listen.js';

// A server that breaks the contract on purpose: the check must turn such a response into an error.
async function listenWith(listEventTypes: RouteHandlers['listEventTypes']) {
  const fastify = Fastify();
  addResponseValidation(fastify);
  fastify.register(openapiGlue, {
    specification,
    serviceHandlers: { listEventTypes },
    prefix: '/api',
  });
  return listen(fastify);
}

const eventType = { id: 'intro-call', name: 'Знакомство', durationMinutes: 30 };

let app: RunningApp;

afterEach(async () => {
  await app.close();
});

test('passes a response that matches the contract', async () => {
  app = await listenWith(async (_request, reply) => reply.code(200).send([eventType]));

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([eventType]);
});

test('fails a response with a status code the operation does not declare', async () => {
  // @ts-expect-error -- the generated handler types already reject an undeclared status code.
  app = await listenWith(async (_request, reply) => reply.code(201).send([eventType]));

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({
    message: expect.stringContaining('status 201 is not declared'),
  });
});

test('fails a response with a field the contract does not declare', async () => {
  app = await listenWith(async (_request, reply) =>
    // @ts-expect-error -- the generated handler types already reject a field the contract does not declare.
    reply.code(200).send([{ ...eventType, createdAt: '2026-11-02T10:00:00+03:00' }]),
  );

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({
    message: expect.stringContaining('must NOT have additional properties'),
  });
});

test('fails a response with a value of the wrong type', async () => {
  app = await listenWith(async (_request, reply) =>
    // @ts-expect-error -- the generated handler types already reject a string duration.
    reply.code(200).send([{ ...eventType, durationMinutes: '30' }]),
  );

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(500);
  expect(await response.json()).toMatchObject({
    message: expect.stringContaining('must be integer'),
  });
});
