import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, test } from 'vitest';

import type { ListEventTypesResponse } from './api/generated/index.ts';
import { renderApp } from './test/render-app.tsx';
import { server } from './test/server.ts';

function respondWithEventTypes(eventTypes: ListEventTypesResponse) {
  server.use(http.get('*/api/event-types', () => HttpResponse.json(eventTypes)));
}

test.each(['/book', '/admin'])(
  '%s shows an empty state while there are no Event Types',
  async (path) => {
    respondWithEventTypes([]);

    renderApp(path);

    expect(await screen.findByText('Типов событий пока нет')).toBeDefined();
  },
);

test.each(['/book', '/admin'])(
  '%s lists Event Types in the order the API returns them',
  async (path) => {
    respondWithEventTypes([
      { id: 'intro-call', name: 'Знакомство', durationMinutes: 30 },
      { id: 'consultation', name: 'Консультация', durationMinutes: 60 },
    ]);

    renderApp(path);

    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('link').textContent)).toEqual([
      'Знакомство',
      'Консультация',
    ]);
  },
);

test('/book shows the name, description and duration of each Event Type and links to its page', async () => {
  respondWithEventTypes([
    {
      id: 'intro-call',
      name: 'Знакомство',
      description: 'Короткий звонок, чтобы познакомиться',
      durationMinutes: 30,
    },
    { id: 'consultation', name: 'Консультация', durationMinutes: 90 },
  ]);

  renderApp('/book');

  const [introCall, consultation] = await screen.findAllByRole('listitem');

  const introCallItem = within(introCall);
  expect(introCallItem.getByRole('link', { name: 'Знакомство' }).getAttribute('href')).toBe(
    '/book/intro-call',
  );
  expect(introCallItem.getByText('Короткий звонок, чтобы познакомиться')).toBeDefined();
  expect(introCallItem.getByText('30 мин')).toBeDefined();

  const consultationItem = within(consultation);
  expect(consultationItem.getByRole('link', { name: 'Консультация' }).getAttribute('href')).toBe(
    '/book/consultation',
  );
  expect(consultationItem.getByText('1 ч 30 мин')).toBeDefined();
});
