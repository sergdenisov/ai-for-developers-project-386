import Fastify from 'fastify';
import { afterEach, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { addErrorHandling } from '../src/errors.js';
import { listen, type RunningApp } from './listen.js';

let app: RunningApp;

afterEach(async () => {
  await app.close();
});

test.each(['/api/no-such-route', '/no-api-prefix'])(
  'answers an unknown route %s with NOT_FOUND in the common error shape',
  async (path) => {
    app = await listen(buildApp({ validateResponses: true }));

    const response = await fetch(app.url(path));

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({ code: 'NOT_FOUND', message: 'Не найдено' });
  },
);

test('answers a body that is not valid JSON with VALIDATION_FAILED', async () => {
  app = await listen(buildApp({ validateResponses: true }));

  const response = await fetch(app.url('/api/event-types'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"name": ',
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    code: 'VALIDATION_FAILED',
    message: 'Проверьте введённые данные',
  });
});

test('answers an unexpected error with INTERNAL_ERROR and no details', async () => {
  const fastify = Fastify();
  addErrorHandling(fastify);
  fastify.get('/boom', async () => {
    throw new Error('details that must not reach the client');
  });
  app = await listen(fastify);

  const response = await fetch(app.url('/boom'));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    code: 'INTERNAL_ERROR',
    message: 'Что-то пошло не так, попробуйте ещё раз',
  });
});
