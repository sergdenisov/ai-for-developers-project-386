import { afterAll, beforeAll, expect, test } from 'vitest';
import { buildApp } from '../src/app.js';

const app = buildApp();

beforeAll(async () => {
  await app.listen({ port: 0, host: '127.0.0.1' });
});

afterAll(async () => {
  await app.close();
});

test('app starts and responds over HTTP', async () => {
  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server is not listening on a TCP port');
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/`);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ hello: 'world' });
});
