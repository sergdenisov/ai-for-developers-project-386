import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';

import type {
  CreateBookingError,
  CreateBookingRequest,
  CreateBookingResponse,
  GetEventTypeResponse,
  GetFreeSlotsResponse,
  Slot,
} from './api/generated/index.ts';
import { renderApp } from './test/render-app.tsx';
import { server } from './test/server.ts';

const introCall: GetEventTypeResponse = {
  id: 'intro-call',
  name: 'Знакомство',
  durationMinutes: 30,
};

const nineOClock: Slot = {
  startsAt: '2026-11-03T09:00:00+03:00',
  endsAt: '2026-11-03T09:30:00+03:00',
};
const tenOClock: Slot = {
  startsAt: '2026-11-03T10:00:00+03:00',
  endsAt: '2026-11-03T10:30:00+03:00',
};

/** The Booking Window from 2 November; only 3 November has the given Free Slots. */
function freeSlots(slots: Slot[]): GetFreeSlotsResponse {
  return {
    window: { firstDate: '2026-11-02', lastDate: '2026-11-15' },
    days: Array.from({ length: 14 }, (_, index) => {
      const date = `2026-11-${String(index + 2).padStart(2, '0')}`;
      return { date, slots: date === '2026-11-03' ? slots : [] };
    }),
  };
}

/** The Free Slots the server gives now; a test changes them to what the server would give after a Booking. */
let currentFreeSlots: GetFreeSlotsResponse;
/** How many times the page has asked for the Free Slots. */
let freeSlotsRequests: number;
/** Request bodies `POST /bookings` has received. */
let bookingRequests: CreateBookingRequest[];

beforeEach(() => {
  currentFreeSlots = freeSlots([nineOClock, tenOClock]);
  freeSlotsRequests = 0;
  bookingRequests = [];
  server.use(
    http.get('*/api/event-types/intro-call', () => HttpResponse.json(introCall)),
    http.get('*/api/event-types/intro-call/free-slots', () => {
      freeSlotsRequests += 1;
      return HttpResponse.json(currentFreeSlots);
    }),
  );
});

/** A promise that the test resolves when it chooses to. */
function deferred() {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: () => resolvePromise?.() };
}

/** Answers `POST /bookings` with `status` and `body` once `release` resolves, recording each request body. */
function respondToBooking(
  status: number,
  body: CreateBookingResponse | CreateBookingError,
  release: Promise<void> = Promise.resolve(),
) {
  server.use(
    http.post('*/api/bookings', async ({ request }) => {
      bookingRequests.push((await request.json()) as CreateBookingRequest);
      await release;
      return HttpResponse.json(body, { status });
    }),
  );
}

const booking: CreateBookingResponse = {
  id: '7f0c7a52-4b8e-4b8a-9a1e-3f1b8c2d9e10',
  eventType: { id: 'intro-call', name: 'Знакомство' },
  startsAt: '2026-11-03T10:00:00+03:00',
  endsAt: '2026-11-03T10:30:00+03:00',
  guest: { name: 'Анна Петрова', email: 'anna@example.com' },
  createdAt: '2026-11-02T18:05:00+03:00',
};

/** Opens the Event Type page, chooses 3 November and the Slot at 10:00. */
async function chooseTenOClock() {
  renderApp('/book/intro-call');
  fireEvent.click(await screen.findByRole('button', { name: '3 ноября 2026' }));
  fireEvent.click(await screen.findByRole('button', { name: '10:00–10:30' }));
}

function fillForm({ name, email }: { name: string; email: string }) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Имя' }), { target: { value: name } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: email } });
}

function confirmButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Подтвердить запись' });
}

/** The text of everything that describes a field: its hint and its error. */
function descriptionOf(field: HTMLElement) {
  const ids = field.getAttribute('aria-describedby')?.split(' ') ?? [];
  return ids.map((id) => document.getElementById(id)?.textContent).join(' ');
}

/** The Free Slots listed for 3 November. */
async function slotsOfNovemberThird() {
  const list = await screen.findByRole('list', { name: '3 ноября, время МСК' });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('the booking form', () => {
  test('shows the chosen date, time and duration', async () => {
    await chooseTenOClock();

    const summary = await screen.findByRole('region', { name: 'Подтверждение записи' });
    expect(within(summary).getByText('Знакомство')).toBeDefined();
    expect(within(summary).getByText('3 ноября, 10:00–10:30 МСК')).toBeDefined();
    expect(within(summary).getByText('30 мин')).toBeDefined();
  });

  test('does not send a form without a name or an email', async () => {
    respondToBooking(201, booking);
    await chooseTenOClock();

    fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить запись' }));

    expect(descriptionOf(screen.getByRole('textbox', { name: 'Имя' }))).toContain(
      'Обязательное поле',
    );
    expect(descriptionOf(screen.getByRole('textbox', { name: 'Email' }))).toContain(
      'Обязательное поле',
    );
    expect(bookingRequests).toEqual([]);
  });

  test('shows the server messages next to their fields', async () => {
    respondToBooking(400, {
      code: 'VALIDATION_FAILED',
      message: 'Проверьте введённые данные',
      fields: { 'guest.email': 'Неверный адрес электронной почты' },
    });
    await chooseTenOClock();
    fillForm({ name: 'Анна Петрова', email: 'anna.example.com' });

    fireEvent.click(confirmButton());

    const email = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() => {
      expect(descriptionOf(email)).toContain('Неверный адрес электронной почты');
    });
  });

  test('takes the button out of action while the request is in flight', async () => {
    const { promise: released, resolve: release } = deferred();
    respondToBooking(201, booking, released);
    await chooseTenOClock();
    fillForm({ name: 'Анна Петрова', email: 'anna@example.com' });

    fireEvent.click(confirmButton());

    await waitFor(() => {
      expect(confirmButton().disabled).toBe(true);
    });
    fireEvent.click(confirmButton());
    release();
    expect(await screen.findByRole('heading', { name: 'Запись подтверждена' })).toBeDefined();
    expect(bookingRequests).toHaveLength(1);
  });
});

describe('a confirmed Booking', () => {
  test('sends the Slot and the Guest, then shows the Event Type, date, time and duration', async () => {
    respondToBooking(201, booking);
    await chooseTenOClock();
    fillForm({ name: 'Анна Петрова', email: 'anna@example.com' });

    fireEvent.click(confirmButton());

    const confirmation = await screen.findByRole('region', { name: 'Запись подтверждена' });
    expect(bookingRequests).toEqual([
      {
        eventTypeId: 'intro-call',
        startsAt: '2026-11-03T10:00:00+03:00',
        guest: { name: 'Анна Петрова', email: 'anna@example.com' },
      },
    ]);
    expect(within(confirmation).getByText('Знакомство')).toBeDefined();
    expect(within(confirmation).getByText('3 ноября, 10:00–10:30 МСК')).toBeDefined();
    expect(within(confirmation).getByText('30 мин')).toBeDefined();
  });

  test('«Записаться ещё» goes back to the calendar with Free Slots loaded again', async () => {
    respondToBooking(201, booking);
    await chooseTenOClock();
    fillForm({ name: 'Анна Петрова', email: 'anna@example.com' });
    fireEvent.click(confirmButton());
    currentFreeSlots = freeSlots([nineOClock]);
    const requestsBefore = freeSlotsRequests;

    fireEvent.click(await screen.findByRole('button', { name: 'Записаться ещё' }));
    fireEvent.click(await screen.findByRole('button', { name: '3 ноября 2026' }));

    expect(await slotsOfNovemberThird()).toEqual(['09:00–09:30']);
    expect(freeSlotsRequests).toBeGreaterThan(requestsBefore);
  });
});

describe('a Slot that is no longer free', () => {
  test.each([
    { code: 'SLOT_UNAVAILABLE', message: 'Это время уже занято, выберите другой слот' },
    { code: 'SLOT_STARTED', message: 'Это время уже прошло, выберите другой слот' },
  ] as const)(
    'on 409 $code shows the message and the Free Slots loaded again',
    async ({ code, message }) => {
      respondToBooking(409, { code, message });
      await chooseTenOClock();
      fillForm({ name: 'Анна Петрова', email: 'anna@example.com' });
      currentFreeSlots = freeSlots([nineOClock]);
      const requestsBefore = freeSlotsRequests;

      fireEvent.click(confirmButton());

      expect((await screen.findByRole('alert')).textContent).toBe(message);
      await waitFor(async () => {
        expect(await slotsOfNovemberThird()).toEqual(['09:00–09:30']);
      });
      expect(freeSlotsRequests).toBeGreaterThan(requestsBefore);
      expect(screen.queryByRole('button', { name: 'Подтвердить запись' })).toBeNull();
    },
  );
});
