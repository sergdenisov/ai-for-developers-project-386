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

const guest = { name: 'Анна Петрова', email: 'anna@example.com' };

async function createEventType(id: string, name: string, durationMinutes: number) {
  const response = await fetch(app.url('/api/event-types'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, name, durationMinutes }),
  });
  expect(response.status).toBe(201);
}

function book(body: unknown) {
  return fetch(app.url('/api/bookings'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Books `startsAt` for the Event Type and expects the outcome `status`. */
async function bookAt(eventTypeId: string, startsAt: string, status = 201) {
  const response = await book({ eventTypeId, startsAt, guest });
  expect(response.status).toBe(status);
  return response.json();
}

describe('booking a Free Slot', () => {
  test('answers 201 with the Booking; the server works out its end', async () => {
    await createEventType('consultation', 'Консультация', 60);

    const response = await book({
      eventTypeId: 'consultation',
      startsAt: '2026-11-03T10:00:00+03:00',
      guest: { name: 'Анна Петрова', email: 'Anna.Petrova@Example.com' },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      eventType: { id: 'consultation', name: 'Консультация' },
      startsAt: '2026-11-03T10:00:00+03:00',
      endsAt: '2026-11-03T11:00:00+03:00',
      guest: { name: 'Анна Петрова', email: 'Anna.Petrova@Example.com' },
      createdAt: '2026-11-02T10:00:00+03:00',
    });
  });

  test('trims the name and the email of the Guest before checking them', async () => {
    await createEventType('consultation', 'Консультация', 60);

    const response = await book({
      eventTypeId: 'consultation',
      startsAt: '2026-11-03T10:00:00+03:00',
      guest: { name: `  ${'я'.repeat(100)} `, email: ' anna@example.com  ' },
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      guest: { name: 'я'.repeat(100), email: 'anna@example.com' },
    });
  });
});

/** Books with `changes` on top of a valid request and expects `400 VALIDATION_FAILED` with `fields`. */
async function fieldErrors(changes: Record<string, unknown>) {
  await createEventType('consultation', 'Консультация', 60);
  const response = await book({
    eventTypeId: 'consultation',
    startsAt: '2026-11-03T10:00:00+03:00',
    guest,
    ...changes,
  });
  expect(response.status).toBe(400);
  const body = (await response.json()) as { code: string; message: string; fields: unknown };
  expect(body.code).toBe('VALIDATION_FAILED');
  expect(body.message).toBe('Проверьте введённые данные');
  return body.fields;
}

describe('a request that can never be booked', () => {
  test('answers 400 for every missing field at once', async () => {
    expect(await fieldErrors({ eventTypeId: undefined, startsAt: undefined, guest: {} })).toEqual({
      eventTypeId: 'Обязательное поле',
      startsAt: 'Обязательное поле',
      'guest.name': 'Обязательное поле',
      'guest.email': 'Обязательное поле',
    });
  });

  test('answers 400 for a name that is blank after trimming', async () => {
    expect(await fieldErrors({ guest: { ...guest, name: '   ' } })).toEqual({
      'guest.name': 'Не может быть пустым',
    });
  });

  test('answers 400 for a name longer than 100 characters', async () => {
    expect(await fieldErrors({ guest: { ...guest, name: 'я'.repeat(101) } })).toEqual({
      'guest.name': 'Не длиннее 100 символов',
    });
  });

  test('answers 400 for an email that is not an address', async () => {
    expect(await fieldErrors({ guest: { ...guest, email: 'anna.example.com' } })).toEqual({
      'guest.email': 'Неверный адрес электронной почты',
    });
  });

  test('answers 400 for an email longer than 254 characters', async () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`;
    expect(email).toHaveLength(255);

    expect(await fieldErrors({ guest: { ...guest, email } })).toEqual({
      'guest.email': 'Не длиннее 254 символов',
    });
  });

  test('answers 400 for a start without an offset', async () => {
    expect(await fieldErrors({ startsAt: '2026-11-03T10:00:00' })).toEqual({
      startsAt: 'Нужны дата и время со смещением, например 2026-11-03T10:00:00+03:00',
    });
  });

  test.each([
    {
      reason: 'off the Slot Grid',
      startsAt: '2026-11-03T10:10:00+03:00',
      message: 'Начало должно быть на сетке слотов: каждые 15 минут от начала рабочего дня',
    },
    {
      reason: 'with seconds',
      startsAt: '2026-11-03T10:00:30+03:00',
      message: 'Начало должно быть на сетке слотов: каждые 15 минут от начала рабочего дня',
    },
    {
      reason: 'before Working Hours',
      startsAt: '2026-11-03T08:45:00+03:00',
      message: 'Запись должна целиком уложиться в рабочие часы',
    },
    {
      reason: 'ending after Working Hours',
      startsAt: '2026-11-03T17:15:00+03:00',
      message: 'Запись должна целиком уложиться в рабочие часы',
    },
    {
      reason: 'after the Booking Window',
      startsAt: '2026-11-16T10:00:00+03:00',
      message: 'Записаться можно только на ближайшие 14 дней',
    },
  ])('answers 400 for a start $reason', async ({ startsAt, message }) => {
    expect(await fieldErrors({ startsAt })).toEqual({ startsAt: message });
  });
});

describe('an unknown Event Type', () => {
  test('answers 404 NOT_FOUND, before the start is checked', async () => {
    const response = await book({
      eventTypeId: 'no-such-type',
      startsAt: '2026-11-03T10:10:00+03:00',
      guest,
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: 'NOT_FOUND', message: 'Тип события не найден' });
  });

  test('is checked after the request shape', async () => {
    const response = await book({
      eventTypeId: 'no-such-type',
      startsAt: '2026-11-03T10:00:00+03:00',
    });

    expect(response.status).toBe(400);
  });
});

const slotStarted = { code: 'SLOT_STARTED', message: 'Это время уже прошло, выберите другой слот' };
const slotUnavailable = {
  code: 'SLOT_UNAVAILABLE',
  message: 'Это время уже занято, выберите другой слот',
};

describe('a Slot that has started', () => {
  test.each([
    { reason: 'earlier today', startsAt: '2026-11-02T09:00:00+03:00' },
    { reason: 'exactly now', startsAt: '2026-11-02T10:00:00+03:00' },
    { reason: 'on a past day', startsAt: '2026-11-01T10:00:00+03:00' },
  ])('answers 409 SLOT_STARTED for a Slot that starts $reason', async ({ startsAt }) => {
    await createEventType('consultation', 'Консультация', 60);

    expect(await bookAt('consultation', startsAt, 409)).toEqual(slotStarted);
  });

  test('is still bookable a moment before it starts', async () => {
    await createEventType('consultation', 'Консультация', 60);
    now = new Date('2026-11-02T10:14:59+03:00');

    expect(await bookAt('consultation', '2026-11-02T10:15:00+03:00')).toMatchObject({
      startsAt: '2026-11-02T10:15:00+03:00',
    });
  });
});

/** The starts of the Free Slots of the Event Type on the date. */
async function freeStarts(eventTypeId: string, date: string): Promise<string[]> {
  const response = await fetch(app.url(`/api/event-types/${eventTypeId}/free-slots`));
  expect(response.status).toBe(200);
  const { days } = (await response.json()) as {
    days: { date: string; slots: { startsAt: string }[] }[];
  };
  return days.find((day) => day.date === date)?.slots.map(({ startsAt }) => startsAt) ?? [];
}

describe('two Bookings never overlap', () => {
  test('a 30-minute Slot of another Event Type inside a 60-minute Booking is taken', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro-call', 'Знакомство', 30);
    await bookAt('consultation', '2026-11-03T10:00:00+03:00');

    expect(await bookAt('intro-call', '2026-11-03T10:30:00+03:00', 409)).toEqual(slotUnavailable);
    expect(await freeStarts('intro-call', '2026-11-03')).not.toContain('2026-11-03T10:30:00+03:00');
  });

  test('a Slot may start exactly when a Booking ends, but not while it lasts', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await bookAt('consultation', '2026-11-03T10:00:00+03:00');

    expect(await bookAt('consultation', '2026-11-03T11:00:00+03:00')).toMatchObject({
      startsAt: '2026-11-03T11:00:00+03:00',
      endsAt: '2026-11-03T12:00:00+03:00',
    });
    expect(await bookAt('consultation', '2026-11-03T10:30:00+03:00', 409)).toEqual(slotUnavailable);
  });

  test('a Slot that ends exactly when a Booking starts is free', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro-call', 'Знакомство', 30);
    await bookAt('consultation', '2026-11-03T10:00:00+03:00');

    expect(await bookAt('intro-call', '2026-11-03T09:30:00+03:00')).toMatchObject({
      startsAt: '2026-11-03T09:30:00+03:00',
      endsAt: '2026-11-03T10:00:00+03:00',
    });
  });

  test('the same start given in another offset is the same moment', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await bookAt('consultation', '2026-11-03T10:00:00+03:00');

    expect(await bookAt('consultation', '2026-11-03T07:00:00Z', 409)).toEqual(slotUnavailable);
  });

  test('the Free Slots of every Event Type leave out the time a Booking takes', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro-call', 'Знакомство', 30);
    await createEventType('quick-question', 'Короткий вопрос', 15);
    await bookAt('intro-call', '2026-11-03T10:00:00+03:00');

    const consultation = await freeStarts('consultation', '2026-11-03');
    expect(consultation).toContain('2026-11-03T09:00:00+03:00');
    expect(consultation).not.toContain('2026-11-03T09:15:00+03:00');
    expect(consultation).not.toContain('2026-11-03T10:15:00+03:00');
    expect(consultation).toContain('2026-11-03T10:30:00+03:00');

    const intro = await freeStarts('intro-call', '2026-11-03');
    expect(intro).toContain('2026-11-03T09:30:00+03:00');
    expect(intro).not.toContain('2026-11-03T09:45:00+03:00');
    expect(intro).not.toContain('2026-11-03T10:00:00+03:00');
    expect(intro).not.toContain('2026-11-03T10:15:00+03:00');
    expect(intro).toContain('2026-11-03T10:30:00+03:00');

    const quick = await freeStarts('quick-question', '2026-11-03');
    expect(quick).toContain('2026-11-03T09:45:00+03:00');
    expect(quick).not.toContain('2026-11-03T10:00:00+03:00');
    expect(quick).not.toContain('2026-11-03T10:15:00+03:00');
    expect(quick).toContain('2026-11-03T10:30:00+03:00');
  });

  test('of simultaneous requests for overlapping time exactly one succeeds', async () => {
    await createEventType('consultation', 'Консультация', 60);
    await createEventType('intro-call', 'Знакомство', 30);

    // Every one of these overlaps every other: 10:00–11:00 and 10:30–11:00.
    const requests = Array.from({ length: 10 }, (_, index) =>
      index % 2 === 0
        ? { eventTypeId: 'consultation', startsAt: '2026-11-03T10:00:00+03:00' }
        : { eventTypeId: 'intro-call', startsAt: '2026-11-03T10:30:00+03:00' },
    );
    const responses = await Promise.all(requests.map((request) => book({ ...request, guest })));

    const statuses = responses.map(({ status }) => status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(9);
    const conflicts = await Promise.all(
      responses.filter(({ status }) => status === 409).map((response) => response.json()),
    );
    expect(conflicts).toEqual(Array.from({ length: 9 }, () => slotUnavailable));
  });
});
