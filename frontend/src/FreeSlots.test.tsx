import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';

import type { GetEventTypeResponse, GetFreeSlotsResponse } from './api/generated/index.ts';
import { renderApp } from './test/render-app.tsx';
import { server } from './test/server.ts';

const introCall: GetEventTypeResponse = {
  id: 'intro-call',
  name: 'Знакомство',
  durationMinutes: 30,
};

const dates = Array.from(
  { length: 14 },
  (_, index) => `2026-11-${String(index + 2).padStart(2, '0')}`,
);

/** 2 November after 18:00: today is empty, 3 November has three Slots, the other days are booked up. */
const freeSlots: GetFreeSlotsResponse = {
  window: { firstDate: '2026-11-02', lastDate: '2026-11-15' },
  days: dates.map((date) => ({
    date,
    slots:
      date === '2026-11-03'
        ? [
            { startsAt: '2026-11-03T09:00:00+03:00', endsAt: '2026-11-03T09:30:00+03:00' },
            // The same kind of moment with another offset: still 10:00 in Moscow.
            { startsAt: '2026-11-03T07:00:00Z', endsAt: '2026-11-03T07:30:00Z' },
            { startsAt: '2026-11-03T17:30:00+03:00', endsAt: '2026-11-03T18:00:00+03:00' },
          ]
        : [],
  })),
};

beforeEach(() => {
  server.use(
    http.get('*/api/event-types/intro-call', () => HttpResponse.json(introCall)),
    http.get('*/api/event-types/intro-call/free-slots', () => HttpResponse.json(freeSlots)),
  );
});

function day(name: string) {
  return screen.getByRole<HTMLButtonElement>('button', { name });
}

test('disables the days of the Booking Window that have no Free Slots', async () => {
  renderApp('/book/intro-call');

  expect(
    (await screen.findByRole<HTMLButtonElement>('button', { name: '3 ноября 2026' })).disabled,
  ).toBe(false);
  expect(day('2 ноября 2026').disabled).toBe(true);
  expect(day('4 ноября 2026').disabled).toBe(true);
  expect(day('15 ноября 2026').disabled).toBe(true);
});

test('shows the Free Slots of the chosen day in Moscow time', async () => {
  renderApp('/book/intro-call');

  fireEvent.click(await screen.findByRole('button', { name: '3 ноября 2026' }));

  const slots = await screen.findByRole('list', { name: '3 ноября, время МСК' });
  expect(
    within(slots)
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual(['09:00–09:30', '10:00–10:30', '17:30–18:00']);
});
