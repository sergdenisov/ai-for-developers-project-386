import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { listen, type RunningApp } from './listen.js';

let app: RunningApp;

beforeEach(async () => {
  app = await listen(buildApp({ validateResponses: true }));
});

afterEach(async () => {
  await app.close();
});

function createEventType(body: unknown) {
  return fetch(app.url('/api/event-types'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function listEventTypes() {
  const response = await fetch(app.url('/api/event-types'));
  expect(response.status).toBe(200);
  return response.json();
}

test('lists no Event Types while none have been created', async () => {
  expect(await listEventTypes()).toEqual([]);
});

describe('creating an Event Type', () => {
  test('keeps the id the Owner chose', async () => {
    const response = await createEventType({
      id: 'intro-call',
      name: 'Знакомство',
      description: 'Короткий звонок, чтобы познакомиться',
      durationMinutes: 30,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 'intro-call',
      name: 'Знакомство',
      description: 'Короткий звонок, чтобы познакомиться',
      durationMinutes: 30,
    });
  });

  test('assigns a UUID v4 id when the Owner gives none', async () => {
    const response = await createEventType({ name: 'Консультация', durationMinutes: 60 });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      name: 'Консультация',
      durationMinutes: 60,
    });
  });

  test('trims the name and treats a blank description as none', async () => {
    const response = await createEventType({
      id: 'intro-call',
      name: '  Знакомство ',
      description: ' \n ',
      durationMinutes: 30,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 'intro-call',
      name: 'Знакомство',
      durationMinutes: 30,
    });
  });

  test('silently drops fields the contract does not list', async () => {
    // The response serializer would hide extra fields anyway, so also look at what reaches the handlers.
    await app.close();
    const fastify = buildApp({ validateResponses: true });
    const bodies: unknown[] = [];
    fastify.addHook('preHandler', async (request) => {
      bodies.push(request.body);
    });
    app = await listen(fastify);

    const response = await createEventType({
      id: 'intro-call',
      name: 'Знакомство',
      durationMinutes: 30,
      createdAt: '2026-11-02T10:00:00+03:00',
      owner: 'someone else',
    });

    const created = { id: 'intro-call', name: 'Знакомство', durationMinutes: 30 };
    expect(bodies[0]).toEqual(created);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(created);
    expect(await listEventTypes()).toEqual([created]);
  });
});

test('lists Event Types in creation order, oldest first', async () => {
  // One after another: parallel requests would not fix the creation order.
  await createEventType({ name: 'Знакомство', durationMinutes: 30 });
  await createEventType({ name: 'Консультация', durationMinutes: 60 });
  await createEventType({ name: 'Ревью кода', durationMinutes: 90 });

  const eventTypes: { name: string }[] = await listEventTypes();

  expect(eventTypes.map(({ name }) => name)).toEqual(['Знакомство', 'Консультация', 'Ревью кода']);
});

describe('rejecting invalid data with field errors', () => {
  const valid = { name: 'Знакомство', durationMinutes: 30 };

  const idFormat = 'Только строчные латинские буквы и цифры, слова через один дефис';

  test.each([
    [
      'a duration off the 15-minute step',
      { durationMinutes: 20 },
      { durationMinutes: 'Должно быть кратно 15' },
    ],
    ['a zero duration', { durationMinutes: 0 }, { durationMinutes: 'Не меньше 15' }],
    [
      'a duration longer than Working Hours',
      { durationMinutes: 555 },
      { durationMinutes: 'Не больше 540' },
    ],
    ['a name over 100 characters', { name: 'я'.repeat(101) }, { name: 'Не длиннее 100 символов' }],
    ['a blank name', { name: '   ' }, { name: 'Не может быть пустым' }],
    ['no name', { name: undefined }, { name: 'Обязательное поле' }],
    [
      'a description over 1000 characters',
      { description: 'я'.repeat(1001) },
      { description: 'Не длиннее 1000 символов' },
    ],
    ['an id over 50 characters', { id: 'a'.repeat(51) }, { id: 'Не длиннее 50 символов' }],
    ['an id with capitals', { id: 'Intro-Call' }, { id: idFormat }],
    ['an id with a double hyphen', { id: 'intro--call' }, { id: idFormat }],
    ['an id in Cyrillic', { id: 'встреча' }, { id: idFormat }],
    [
      'several invalid fields at once',
      { name: '', durationMinutes: 20 },
      { name: 'Не может быть пустым', durationMinutes: 'Должно быть кратно 15' },
    ],
  ])('rejects %s', async (_case, change, fields) => {
    const response = await createEventType({ ...valid, ...change });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Проверьте введённые данные',
      fields,
    });
    expect(await listEventTypes()).toEqual([]);
  });
});

describe('rejecting a duplicate', () => {
  test('of the id', async () => {
    await createEventType({ id: 'intro-call', name: 'Знакомство', durationMinutes: 30 });

    const response = await createEventType({
      id: 'intro-call',
      name: 'Другое',
      durationMinutes: 60,
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'EVENT_TYPE_ID_TAKEN',
      message: 'Такой идентификатор уже занят',
    });
    expect(await listEventTypes()).toHaveLength(1);
  });

  test('of the name, ignoring letter case and surrounding spaces', async () => {
    await createEventType({ name: 'Знакомство', durationMinutes: 30 });

    const response = await createEventType({ name: '  знакомСТВО ', durationMinutes: 60 });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: 'EVENT_TYPE_NAME_TAKEN',
      message: 'Тип события с таким названием уже есть',
    });
    expect(await listEventTypes()).toHaveLength(1);
  });
});
