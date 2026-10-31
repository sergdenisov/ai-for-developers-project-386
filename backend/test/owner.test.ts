import { afterEach, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { listen, type RunningApp } from './listen.js';

let app: RunningApp;

afterEach(async () => {
  await app.close();
});

test('returns the Owner profile', async () => {
  app = await listen(buildApp({ validateResponses: true }));

  const response = await fetch(app.url('/api/owner'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    name: 'Сергей Денисов',
    timeZone: 'Europe/Moscow',
    workingHours: { start: '09:00', end: '18:00' },
    bookingWindowDays: 14,
  });
});
