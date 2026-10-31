import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { GetOwnerResponse } from '../api/generated/index.ts';

/** The profile the default handler returns; tests that need other Working Hours override `GET /owner`. */
export const owner: GetOwnerResponse = {
  name: 'Сергей Денисов',
  timeZone: 'Europe/Moscow',
  workingHours: { start: '09:00', end: '18:00' },
  bookingWindowDays: 14,
};

/**
 * Stands in for the backend at the `fetch` level, so the generated SDK stays in the chain. Every page may read the
 * Owner profile, so it has a default handler; tests add the others with `server.use`.
 */
export const server = setupServer(http.get('*/api/owner', () => HttpResponse.json(owner)));
