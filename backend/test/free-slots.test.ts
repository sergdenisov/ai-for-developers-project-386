import { afterEach, beforeEach, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { listen, type RunningApp } from './listen.js';

let app: RunningApp;
/** The app's clock: 2 November 2026, 10:00 Moscow time unless a test moves it. */
let now: Date;

beforeEach(async () => {
  now = new Date('2026-11-02T10:00:00+03:00');
  app = await listen(buildApp({ validateResponses: true, now: () => now }));
});

afterEach(async () => {
  await app.close();
});

async function createEventType(id: string, durationMinutes: number) {
  const response = await fetch(app.url('/api/event-types'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, name: id, durationMinutes }),
  });
  expect(response.status).toBe(201);
}

type Slot = { startsAt: string; endsAt: string };
type FreeSlots = {
  window: { firstDate: string; lastDate: string };
  days: { date: string; slots: Slot[] }[];
};

async function getFreeSlots(id: string): Promise<FreeSlots> {
  const response = await fetch(app.url(`/api/event-types/${id}/free-slots`));
  expect(response.status).toBe(200);
  return (await response.json()) as FreeSlots;
}

function slotsOn(freeSlots: FreeSlots, date: string): Slot[] {
  return freeSlots.days.find((day) => day.date === date)?.slots ?? [];
}

test('lists the 14 days of the Booking Window in order, with its bounds', async () => {
  await createEventType('consultation', 60);

  const freeSlots = await getFreeSlots('consultation');

  expect(freeSlots.window).toEqual({ firstDate: '2026-11-02', lastDate: '2026-11-15' });
  expect(freeSlots.days).toHaveLength(14);
  expect(freeSlots.days[0]?.date).toBe('2026-11-02');
  expect(freeSlots.days[13]?.date).toBe('2026-11-15');
});

test('gives Slots on the 15-minute grid from 09:00 to the last start, with the +03:00 offset', async () => {
  await createEventType('consultation', 60);

  const slots = slotsOn(await getFreeSlots('consultation'), '2026-11-03');

  expect(slots.slice(0, 2)).toEqual([
    { startsAt: '2026-11-03T09:00:00+03:00', endsAt: '2026-11-03T10:00:00+03:00' },
    { startsAt: '2026-11-03T09:15:00+03:00', endsAt: '2026-11-03T10:15:00+03:00' },
  ]);
  expect(slots.at(-1)).toEqual({
    startsAt: '2026-11-03T17:00:00+03:00',
    endsAt: '2026-11-03T18:00:00+03:00',
  });
  expect(slots).toHaveLength(33);
});

test('leaves out the Slots of today that have started, including one that starts now', async () => {
  await createEventType('consultation', 60);

  const today = slotsOn(await getFreeSlots('consultation'), '2026-11-02');

  expect(today[0]?.startsAt).toBe('2026-11-02T10:15:00+03:00');
});

test('follows the clock: after 18:00 today is empty, and at midnight the window moves', async () => {
  await createEventType('consultation', 60);

  now = new Date('2026-11-02T18:00:00+03:00');
  const evening = await getFreeSlots('consultation');
  expect(evening.days[0]).toEqual({ date: '2026-11-02', slots: [] });

  now = new Date('2026-11-03T00:00:00+03:00');
  const midnight = await getFreeSlots('consultation');
  expect(midnight.window).toEqual({ firstDate: '2026-11-03', lastDate: '2026-11-16' });
  expect(midnight.days[0]?.slots[0]?.startsAt).toBe('2026-11-03T09:00:00+03:00');
});

test('is not cached', async () => {
  await createEventType('consultation', 60);

  const response = await fetch(app.url('/api/event-types/consultation/free-slots'));

  expect(response.headers.get('cache-control')).toBe('no-store');
});

test('answers 404 NOT_FOUND for an unknown Event Type', async () => {
  const response = await fetch(app.url('/api/event-types/no-such-type/free-slots'));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: 'NOT_FOUND', message: 'Тип события не найден' });
});
