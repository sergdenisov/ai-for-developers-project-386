import { screen } from '@testing-library/react';
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
    expect(items.map((item) => item.textContent)).toEqual(['Знакомство', 'Консультация']);
  },
);
