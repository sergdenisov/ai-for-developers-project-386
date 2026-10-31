import { randomUUID } from 'node:crypto';

import type { EventType, Guest } from './api/generated/index.js';
import { checkBooking, type Period, slotEnd } from './slots.js';

/** A Booking as the store keeps it: moments as `Date`, formatted only in the response. */
export type StoredBooking = Period & {
  id: string;
  eventType: { id: string; name: string };
  guest: Guest;
  createdAt: Date;
};

export type BookOutcome =
  | { kind: 'booked'; booking: StoredBooking }
  /** The start can never begin a Slot of the Event Type; one message per field. */
  | { kind: 'invalid'; fields: Record<string, string> }
  /** The Slot has started or overlaps a Booking of any Event Type. */
  | { kind: 'conflict'; code: 'SLOT_STARTED' | 'SLOT_UNAVAILABLE'; message: string };

/**
 * Trims the Guest's name and email in a raw `createBooking` body, in place. The contract checks their length and
 * format after trimming, so this runs before the request is validated; anything that is not a string is left for
 * the validation to report.
 */
export function trimGuest(body: unknown) {
  const guest = (body as { guest?: unknown } | null)?.guest;
  if (typeof guest !== 'object' || guest === null) {
    return;
  }
  const fields = guest as Record<string, unknown>;
  for (const field of ['name', 'email']) {
    const value = fields[field];
    if (typeof value === 'string') {
      fields[field] = value.trim();
    }
  }
}

const startMessages = {
  'off-grid': 'Начало должно быть на сетке слотов: каждые 15 минут от начала рабочего дня',
  'outside-working-hours': 'Запись должна целиком уложиться в рабочие часы',
  'after-window': 'Записаться можно только на ближайшие 14 дней',
} as const;

/**
 * Bookings in memory. `book` checks the Slot and inserts the Booking in one synchronous step, with nothing awaited
 * in between, so of several simultaneous requests for overlapping time exactly one succeeds.
 */
export function createBookingStore() {
  const bookings: StoredBooking[] = [];

  return {
    /** Every Booking, of every Event Type: the time they take is not free for any Event Type. */
    list: (): readonly StoredBooking[] => bookings,

    book({
      eventType,
      startsAt,
      guest,
      now,
    }: {
      eventType: EventType;
      startsAt: Date;
      guest: Guest;
      now: Date;
    }): BookOutcome {
      const check = checkBooking({
        startsAt,
        durationMinutes: eventType.durationMinutes,
        now,
        bookings,
      });
      switch (check) {
        case 'off-grid':
        case 'outside-working-hours':
        case 'after-window':
          return { kind: 'invalid', fields: { startsAt: startMessages[check] } };
        case 'started':
          return {
            kind: 'conflict',
            code: 'SLOT_STARTED',
            message: 'Это время уже прошло, выберите другой слот',
          };
        case 'unavailable':
          return {
            kind: 'conflict',
            code: 'SLOT_UNAVAILABLE',
            message: 'Это время уже занято, выберите другой слот',
          };
        case 'valid':
          break;
      }

      const booking: StoredBooking = {
        id: randomUUID(),
        eventType: { id: eventType.id, name: eventType.name },
        startsAt,
        endsAt: slotEnd(startsAt, eventType.durationMinutes),
        guest,
        createdAt: now,
      };
      bookings.push(booking);
      return { kind: 'booked', booking };
    },
  };
}
