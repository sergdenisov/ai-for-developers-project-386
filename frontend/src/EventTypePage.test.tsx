import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';

import type {
  ApiError,
  GetEventTypeResponse,
  GetFreeSlotsResponse,
} from './api/generated/index.ts';
import { renderApp } from './test/render-app.tsx';
import { server } from './test/server.ts';

const introCall: GetEventTypeResponse = {
  id: 'intro-call',
  name: 'Знакомство',
  description: 'Короткий звонок, чтобы познакомиться',
  durationMinutes: 30,
};

/** A Booking Window without Free Slots: these tests are about the page, not the calendar. */
const noFreeSlots: GetFreeSlotsResponse = {
  window: { firstDate: '2026-11-02', lastDate: '2026-11-15' },
  days: Array.from({ length: 14 }, (_, index) => ({
    date: `2026-11-${String(index + 2).padStart(2, '0')}`,
    slots: [],
  })),
};

beforeEach(() => {
  server.use(http.get('*/api/event-types/:id/free-slots', () => HttpResponse.json(noFreeSlots)));
});

test('shows who the Guest books with and the name, description and duration of the Event Type', async () => {
  server.use(http.get('*/api/event-types/intro-call', () => HttpResponse.json(introCall)));

  renderApp('/book/intro-call');

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Запись на звонок: Сергей Денисов' }),
  ).toBeDefined();
  expect(await screen.findByRole('heading', { level: 2, name: 'Знакомство' })).toBeDefined();
  expect(screen.getByText('Короткий звонок, чтобы познакомиться')).toBeDefined();
  expect(screen.getByText('30 мин')).toBeDefined();
});

test('shows «Тип события не найден» with a link to the list for an unknown id', async () => {
  const notFound: ApiError = { code: 'NOT_FOUND', message: 'Тип события не найден' };
  let requests = 0;
  server.use(
    http.get('*/api/event-types/no-such-type', () => {
      requests += 1;
      return HttpResponse.json(notFound, { status: 404 });
    }),
  );

  renderApp('/book/no-such-type');

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Тип события не найден' }),
  ).toBeDefined();
  expect(screen.getByRole('link', { name: 'К списку типов событий' }).getAttribute('href')).toBe(
    '/book',
  );
  // The server's answer is final: asking again would only delay the page.
  expect(requests).toBe(1);
});

test('shows the server message when the Event Type still cannot be loaded after retries', async () => {
  const failure: ApiError = {
    code: 'INTERNAL_ERROR',
    message: 'Что-то пошло не так, попробуйте ещё раз',
  };
  let requests = 0;
  server.use(
    http.get('*/api/event-types/intro-call', () => {
      requests += 1;
      return HttpResponse.json(failure, { status: 500 });
    }),
  );

  renderApp('/book/intro-call');

  expect(await screen.findByText('Что-то пошло не так, попробуйте ещё раз')).toBeDefined();
  expect(screen.queryByText('Тип события не найден')).toBeNull();
  // A server failure may pass, so the page asks again before giving up.
  expect(requests).toBe(4);
});

test('opens the page of an Event Type from the list', async () => {
  server.use(
    http.get('*/api/event-types', () => HttpResponse.json([introCall])),
    http.get('*/api/event-types/intro-call', () => HttpResponse.json(introCall)),
  );
  renderApp('/book');

  fireEvent.click(await screen.findByRole('link', { name: 'Знакомство' }));

  expect(await screen.findByRole('heading', { level: 2, name: 'Знакомство' })).toBeDefined();
});
