import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, expect, test } from 'vitest';

import type {
  CreateEventTypeError,
  CreateEventTypeRequest,
  CreateEventTypeResponse,
  ListEventTypesResponse,
} from './api/generated/index.ts';
import { renderApp } from './test/render-app.tsx';
import { owner, server } from './test/server.ts';

/** Request bodies `POST /event-types` has received. */
let requests: CreateEventTypeRequest[];

beforeEach(() => {
  requests = [];
  server.use(http.get('*/api/event-types', () => HttpResponse.json([])));
});

/** Answers `POST /event-types` with `status` and `body`, recording each request body. */
function respondToCreate(status: number, body: CreateEventTypeResponse | CreateEventTypeError) {
  server.use(
    http.post('*/api/event-types', async ({ request }) => {
      requests.push((await request.json()) as CreateEventTypeRequest);
      return HttpResponse.json(body, { status });
    }),
  );
}

/** The text of everything that describes a field: its hint and its error. */
function descriptionOf(field: HTMLElement) {
  const ids = field.getAttribute('aria-describedby')?.split(' ') ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent).join(' ');
}

async function fillForm({ name = '', duration = '', id = '' }) {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Название' }), {
    target: { value: name },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Длительность' }), {
    target: { value: duration },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Идентификатор' }), {
    target: { value: id },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Создать' }));
}

test('shows the Owner name in the admin header', async () => {
  renderApp('/admin');

  const main = within(screen.getByRole('main'));
  const header = await main.findByRole('banner');
  expect(within(header).getByRole('heading', { name: 'Админка' })).toBeDefined();
  expect(await within(header).findByText('Сергей Денисов')).toBeDefined();
});

test('offers durations in 15-minute steps up to the length of Working Hours from the profile', async () => {
  server.use(
    http.get('*/api/owner', () =>
      HttpResponse.json({ ...owner, workingHours: { start: '10:00', end: '11:30' } }),
    ),
  );

  renderApp('/admin');

  const duration = await screen.findByRole('combobox', { name: 'Длительность' });
  const options = within(duration)
    .getAllByRole('option')
    .filter((option) => !(option as HTMLOptionElement).disabled);
  expect(options.map((option) => option.textContent)).toEqual([
    '15 мин',
    '30 мин',
    '45 мин',
    '1 ч',
    '1 ч 15 мин',
    '1 ч 30 мин',
  ]);
});

test('does not send a form with empty required fields', async () => {
  respondToCreate(201, { id: 'intro-call', name: 'Знакомство', durationMinutes: 30 });
  renderApp('/admin');
  await fillForm({ name: '   ' });

  submit();

  expect(descriptionOf(screen.getByRole('textbox', { name: 'Название' }))).toContain(
    'Обязательное поле',
  );
  expect(descriptionOf(screen.getByRole('combobox', { name: 'Длительность' }))).toContain(
    'Обязательное поле',
  );
  expect(requests).toEqual([]);
});

test('shows the field errors from the server next to their fields', async () => {
  respondToCreate(400, {
    code: 'VALIDATION_FAILED',
    message: 'Проверьте введённые данные',
    fields: {
      id: 'Только строчные латинские буквы и цифры, слова через один дефис',
      name: 'Не длиннее 100 символов',
    },
  });
  renderApp('/admin');
  await fillForm({ name: 'Знакомство', duration: '30', id: 'Intro-Call' });

  submit();

  const id = screen.getByRole('textbox', { name: 'Идентификатор' });
  await screen.findByText('Не длиннее 100 символов');
  expect(descriptionOf(id)).toContain(
    'Только строчные латинские буквы и цифры, слова через один дефис',
  );
  expect(descriptionOf(screen.getByRole('textbox', { name: 'Название' }))).toContain(
    'Не длиннее 100 символов',
  );
  expect(requests).toEqual([{ name: 'Знакомство', durationMinutes: 30, id: 'Intro-Call' }]);
});

test('shows a taken id next to the id field', async () => {
  respondToCreate(409, { code: 'EVENT_TYPE_ID_TAKEN', message: 'Такой идентификатор уже занят' });
  renderApp('/admin');
  await fillForm({ name: 'Знакомство', duration: '30', id: 'intro-call' });

  submit();

  await screen.findByText('Такой идентификатор уже занят');
  expect(descriptionOf(screen.getByRole('textbox', { name: 'Идентификатор' }))).toContain(
    'Такой идентификатор уже занят',
  );
});

test('shows a taken name next to the name field', async () => {
  respondToCreate(409, {
    code: 'EVENT_TYPE_NAME_TAKEN',
    message: 'Тип события с таким названием уже есть',
  });
  renderApp('/admin');
  await fillForm({ name: 'Знакомство', duration: '30' });

  submit();

  await screen.findByText('Тип события с таким названием уже есть');
  expect(descriptionOf(screen.getByRole('textbox', { name: 'Название' }))).toContain(
    'Тип события с таким названием уже есть',
  );
});

test('adds the new Event Type to the end of the list and notifies the Owner', async () => {
  const eventTypes: ListEventTypesResponse = [
    { id: 'intro-call', name: 'Знакомство', durationMinutes: 30 },
  ];
  const created = { id: 'consultation', name: 'Консультация', durationMinutes: 60 };
  server.use(
    http.get('*/api/event-types', () => HttpResponse.json(eventTypes)),
    http.post('*/api/event-types', () => {
      eventTypes.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  );
  renderApp('/admin');
  await screen.findByText('Знакомство');
  await fillForm({ name: 'Консультация', duration: '60', id: 'consultation' });

  submit();

  expect(await screen.findByText('Тип события «Консультация» создан')).toBeDefined();
  await screen.findByText('Консультация', { selector: 'li *' });
  const items = screen.getAllByRole('listitem');
  expect(items.map((item) => within(item).getByRole('link').textContent)).toEqual([
    'Знакомство',
    'Консультация',
  ]);
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Название' }).value).toBe('');
});
