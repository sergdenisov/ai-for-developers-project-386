import { afterEach, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { listen, type RunningApp } from './listen.js';

let app: RunningApp;

afterEach(async () => {
  await app.close();
});

test('lists no Event Types while none have been created', async () => {
  app = await listen(buildApp({ validateResponses: true }));

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});
