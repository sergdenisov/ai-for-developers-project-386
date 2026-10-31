import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import type { GetOwnerResponse, ListUpcomingResponse } from '../api/generated/index.ts';

/** The profile the default handler returns; tests that need other Working Hours override `GET /owner`. */
export const owner: GetOwnerResponse = {
  name: 'Сергей Денисов',
  timeZone: 'Europe/Moscow',
  workingHours: { start: '09:00', end: '18:00' },
  bookingWindowDays: 14,
};

/** No Upcoming Bookings: the admin page always reads them, and tests that need some override `GET /bookings`. */
const noUpcomingBookings: ListUpcomingResponse = [];

/**
 * Stands in for the backend at the `fetch` level, so the generated SDK stays in the chain. Every page may read the
 * Owner profile and the admin page always reads the Upcoming Bookings, so these have default handlers; tests add the
 * others with `server.use`. A request no handler answers fails the test (see `setup.ts`).
 */
export const server = setupServer(
  http.get('*/api/owner', () => HttpResponse.json(owner)),
  http.get('*/api/bookings', () => HttpResponse.json(noUpcomingBookings)),
);
