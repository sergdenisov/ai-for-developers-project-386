import { afterEach, beforeEach, describe, expect, test } from 'vitest';

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

async function createEventType(id: string, name: string, durationMinutes: number) {
  const response = await fetch(app.url('/api/event-types'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, name, durationMinutes }),
  });
  expect(response.status).toBe(201);
}

async function bookAt(
  eventTypeId: string,
  startsAt: string,
  guest = { name: 'Анна', email: 'anna@example.com' },
) {
  const response = await fetch(app.url('/api/bookings'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventTypeId, startsAt, guest }),
  });
  expect(response.status).toBe(201);
}

async function listUpcoming() {
  const response = await fetch(app.url('/api/bookings'));
  expect(response.status).toBe(200);
  return response.json();
}

/** The starts of the Upcoming Bookings, in the order the list gives them. */
async function upcomingStarts() {
  return (await listUpcoming()).map(({ startsAt }: { startsAt: string }) => startsAt);
}

describe('Upcoming Bookings', () => {
  test('are empty when nobody has booked', async () => {
    expect(await listUpcoming()).toEqual([]);
  });

  test('hold the Bookings of every Event Type in one list', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro', 'Знакомство', 30);
    await bookAt('consultation', '2026-11-03T10:00:00+03:00', {
      name: 'Анна Петрова',
      email: 'anna@example.com',
    });
    now = new Date('2026-11-02T10:05:00+03:00');
    await bookAt('intro', '2026-11-04T09:00:00+03:00', {
      name: 'Иван Сидоров',
      email: 'ivan@example.com',
    });

    expect(await listUpcoming()).toEqual([
      {
        id: expect.any(String),
        eventType: { id: 'consultation', name: 'Консультация' },
        startsAt: '2026-11-03T10:00:00+03:00',
        endsAt: '2026-11-03T11:00:00+03:00',
        guest: { name: 'Анна Петрова', email: 'anna@example.com' },
        createdAt: '2026-11-02T10:00:00+03:00',
      },
      {
        id: expect.any(String),
        eventType: { id: 'intro', name: 'Знакомство' },
        startsAt: '2026-11-04T09:00:00+03:00',
        endsAt: '2026-11-04T09:30:00+03:00',
        guest: { name: 'Иван Сидоров', email: 'ivan@example.com' },
        createdAt: '2026-11-02T10:05:00+03:00',
      },
    ]);
  });

  test('go nearest first, whatever order they were booked in', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro', 'Знакомство', 30);
    await bookAt('consultation', '2026-11-05T12:00:00+03:00');
    await bookAt('intro', '2026-11-03T15:00:00+03:00');
    await bookAt('consultation', '2026-11-04T09:00:00+03:00');
    await bookAt('intro', '2026-11-02T16:30:00+03:00');

    expect(await upcomingStarts()).toEqual([
      '2026-11-02T16:30:00+03:00',
      '2026-11-03T15:00:00+03:00',
      '2026-11-04T09:00:00+03:00',
      '2026-11-05T12:00:00+03:00',
    ]);
  });

  test('keep a call in progress and drop it once it has ended', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await bookAt('consultation', '2026-11-02T11:00:00+03:00');
    await bookAt('consultation', '2026-11-02T13:00:00+03:00');

    // The 11:00–12:00 call has started.
    now = new Date('2026-11-02T11:30:00+03:00');
    expect(await upcomingStarts()).toEqual([
      '2026-11-02T11:00:00+03:00',
      '2026-11-02T13:00:00+03:00',
    ]);

    // A moment before its end it is still on.
    now = new Date('2026-11-02T11:59:59.999+03:00');
    expect(await upcomingStarts()).toEqual([
      '2026-11-02T11:00:00+03:00',
      '2026-11-02T13:00:00+03:00',
    ]);

    // Its end is exactly now: it has ended.
    now = new Date('2026-11-02T12:00:00+03:00');
    expect(await upcomingStarts()).toEqual(['2026-11-02T13:00:00+03:00']);
  });
});
