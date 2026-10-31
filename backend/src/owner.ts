import type { Owner } from './api/generated/index.js';

/** The one Owner (ADR 0001). Fixed values, not environment variables; the frontend reads them from `GET /owner`. */
export const owner: Owner = {
  name: 'Сергей Денисов',
  timeZone: 'Europe/Moscow',
  workingHours: { start: '09:00', end: '18:00' },
  bookingWindowDays: 14,
};
