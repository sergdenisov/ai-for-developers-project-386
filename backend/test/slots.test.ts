import { describe, expect, test } from 'vitest';

import {
  bookingWindow,
  checkBooking,
  checkStart,
  freeSlots,
  overlaps,
  upcoming,
} from '../src/slots.js';

/** 2 November 2026, 10:00 Moscow time. */
const now = new Date('2026-11-02T10:00:00+03:00');

/** A moment given as Moscow wall time. */
function moscow(dateTime: string) {
  return new Date(`${dateTime}+03:00`);
}

function slotsOn(
  date: string,
  durationMinutes: number,
  at = now,
  bookings: { startsAt: Date; endsAt: Date }[] = [],
) {
  const day = freeSlots({ now: at, durationMinutes, bookings }).days.find((d) => d.date === date);
  if (day === undefined) {
    throw new Error(`${date} is not in the Booking Window`);
  }
  return day.slots;
}

describe('Free Slots of a day', () => {
  test.each([
    { durationMinutes: 15, firstEnd: '09:15', lastStart: '17:45' },
    { durationMinutes: 60, firstEnd: '10:00', lastStart: '17:00' },
    { durationMinutes: 540, firstEnd: '18:00', lastStart: '09:00' },
  ])(
    'start at 09:00 and last start at $lastStart for $durationMinutes minutes',
    ({ durationMinutes, firstEnd, lastStart }) => {
      const slots = slotsOn('2026-11-03', durationMinutes);

      expect(slots[0]).toEqual({
        startsAt: moscow('2026-11-03T09:00:00'),
        endsAt: moscow(`2026-11-03T${firstEnd}:00`),
      });
      expect(slots.at(-1)?.startsAt).toEqual(moscow(`2026-11-03T${lastStart}:00`));
      expect(slots.at(-1)?.endsAt).toEqual(moscow('2026-11-03T18:00:00'));
    },
  );

  test('start every 15 minutes', () => {
    const starts = slotsOn('2026-11-03', 60).map(({ startsAt }) => startsAt);

    expect(starts.slice(0, 3)).toEqual([
      moscow('2026-11-03T09:00:00'),
      moscow('2026-11-03T09:15:00'),
      moscow('2026-11-03T09:30:00'),
    ]);
    // 09:00 to 17:00 in 15-minute steps.
    expect(starts).toHaveLength(33);
  });

  test('leave out the Slots of today that have started', () => {
    const slots = slotsOn('2026-11-02', 30, moscow('2026-11-02T10:05:00'));

    expect(slots[0]?.startsAt).toEqual(moscow('2026-11-02T10:15:00'));
  });

  test('count a Slot that starts exactly now as started', () => {
    const slots = slotsOn('2026-11-02', 30, moscow('2026-11-02T10:00:00'));

    expect(slots[0]?.startsAt).toEqual(moscow('2026-11-02T10:15:00'));
  });

  test('keep a Slot that starts a second from now', () => {
    const slots = slotsOn('2026-11-02', 30, moscow('2026-11-02T09:59:59'));

    expect(slots[0]?.startsAt).toEqual(moscow('2026-11-02T10:00:00'));
  });

  test('leave out the Slots that overlap a Booking, and keep those that only touch it', () => {
    const booking = {
      startsAt: moscow('2026-11-03T10:00:00'),
      endsAt: moscow('2026-11-03T11:00:00'),
    };

    const starts = slotsOn('2026-11-03', 30, now, [booking]).map(({ startsAt }) => startsAt);

    expect(starts).toContainEqual(moscow('2026-11-03T09:30:00'));
    expect(starts).not.toContainEqual(moscow('2026-11-03T09:45:00'));
    expect(starts).not.toContainEqual(moscow('2026-11-03T10:00:00'));
    expect(starts).not.toContainEqual(moscow('2026-11-03T10:30:00'));
    expect(starts).toContainEqual(moscow('2026-11-03T11:00:00'));
    // 09:00 to 17:30 is 35 starts; 09:45, 10:00, 10:15, 10:30 and 10:45 overlap the Booking.
    expect(starts).toHaveLength(30);
  });

  test('leave today empty after 18:00', () => {
    expect(slotsOn('2026-11-02', 15, moscow('2026-11-02T18:00:00'))).toEqual([]);
    expect(slotsOn('2026-11-02', 15, moscow('2026-11-02T23:59:59'))).toEqual([]);
  });

  test('leave today empty once the last Slot of the duration has started', () => {
    expect(slotsOn('2026-11-02', 60, moscow('2026-11-02T17:00:00'))).toEqual([]);
    expect(slotsOn('2026-11-02', 15, moscow('2026-11-02T17:00:00'))).toHaveLength(3);
  });
});

describe('the Booking Window', () => {
  test('is today in Moscow and the 13 days after it, every day listed in order', () => {
    const { window, days } = freeSlots({ now, durationMinutes: 30, bookings: [] });

    expect(window).toEqual({ firstDate: '2026-11-02', lastDate: '2026-11-15' });
    expect(days.map(({ date }) => date)).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
  });

  test('moves at midnight in Moscow', () => {
    expect(bookingWindow(moscow('2026-11-02T23:59:59'))).toEqual({
      firstDate: '2026-11-02',
      lastDate: '2026-11-15',
    });
    // Still 2 November in UTC.
    expect(bookingWindow(moscow('2026-11-03T00:00:00'))).toEqual({
      firstDate: '2026-11-03',
      lastDate: '2026-11-16',
    });
  });

  test('runs into the next year', () => {
    expect(bookingWindow(moscow('2026-12-25T12:00:00'))).toEqual({
      firstDate: '2026-12-25',
      lastDate: '2027-01-07',
    });
  });

  test('has Slots on every day after today', () => {
    const { days } = freeSlots({
      now: moscow('2026-11-02T18:00:00'),
      durationMinutes: 60,
      bookings: [],
    });

    expect(days.map(({ slots }) => slots.length)).toEqual([0, ...Array(13).fill(33)]);
  });
});

describe('checking the start of a Booking', () => {
  test.each([
    { startsAt: '2026-11-03T09:00:00', durationMinutes: 60, result: 'valid' },
    { startsAt: '2026-11-03T17:00:00', durationMinutes: 60, result: 'valid' },
    { startsAt: '2026-11-03T17:45:00', durationMinutes: 15, result: 'valid' },
    { startsAt: '2026-11-03T09:00:00', durationMinutes: 540, result: 'valid' },
    { startsAt: '2026-11-15T17:00:00', durationMinutes: 60, result: 'valid' },
    { startsAt: '2026-11-03T09:10:00', durationMinutes: 15, result: 'off-grid' },
    { startsAt: '2026-11-03T09:00:30', durationMinutes: 15, result: 'off-grid' },
    { startsAt: '2026-11-03T08:45:00', durationMinutes: 15, result: 'outside-working-hours' },
    { startsAt: '2026-11-03T17:15:00', durationMinutes: 60, result: 'outside-working-hours' },
    { startsAt: '2026-11-03T18:00:00', durationMinutes: 15, result: 'outside-working-hours' },
    { startsAt: '2026-11-03T09:15:00', durationMinutes: 540, result: 'outside-working-hours' },
    { startsAt: '2026-11-16T09:00:00', durationMinutes: 15, result: 'after-window' },
  ])(
    '$startsAt for $durationMinutes minutes is $result',
    ({ startsAt, durationMinutes, result }) => {
      expect(checkStart({ startsAt: moscow(startsAt), durationMinutes, now })).toBe(result);
    },
  );

  test('takes a start given in another offset by its moment', () => {
    expect(
      checkStart({ startsAt: new Date('2026-11-03T06:00:00Z'), durationMinutes: 60, now }),
    ).toBe('valid');
  });

  test('leaves a start that has passed to the started check', () => {
    expect(checkStart({ startsAt: moscow('2026-11-01T09:00:00'), durationMinutes: 60, now })).toBe(
      'valid',
    );
  });
});

/** A period between two Moscow wall times on 3 November. */
function period(start: string, end: string) {
  return { startsAt: moscow(`2026-11-03T${start}:00`), endsAt: moscow(`2026-11-03T${end}:00`) };
}

describe('overlap of two periods', () => {
  test.each([
    { a: ['10:00', '11:00'], b: ['10:00', '11:00'], result: true, reason: 'the same period' },
    { a: ['10:00', '11:00'], b: ['10:30', '11:00'], result: true, reason: 'a later start inside' },
    { a: ['10:00', '11:00'], b: ['09:30', '10:15'], result: true, reason: 'an earlier start' },
    { a: ['10:00', '11:00'], b: ['10:15', '10:30'], result: true, reason: 'a period inside' },
    { a: ['10:15', '10:30'], b: ['10:00', '11:00'], result: true, reason: 'a period around' },
    { a: ['10:00', '11:00'], b: ['11:00', '11:30'], result: false, reason: 'a start at the end' },
    { a: ['10:00', '11:00'], b: ['09:00', '10:00'], result: false, reason: 'an end at the start' },
    { a: ['10:00', '11:00'], b: ['11:15', '12:00'], result: false, reason: 'a later period' },
  ])('is $result for $reason', ({ a, b, result }) => {
    const [aStart = '', aEnd = ''] = a;
    const [bStart = '', bEnd = ''] = b;

    expect(overlaps(period(aStart, aEnd), period(bStart, bEnd))).toBe(result);
  });
});

describe('checking a new Booking', () => {
  /** 10:00–11:00 on 3 November, of any Event Type. */
  const bookings = [
    { startsAt: moscow('2026-11-03T10:00:00'), endsAt: moscow('2026-11-03T11:00:00') },
  ];

  function check(startsAt: string, durationMinutes: number) {
    return checkBooking({ startsAt: moscow(startsAt), durationMinutes, now, bookings });
  }

  test('accepts a Free Slot, including one that starts when a Booking ends', () => {
    expect(check('2026-11-03T11:00:00', 30)).toBe('valid');
    expect(check('2026-11-03T09:30:00', 30)).toBe('valid');
  });

  test('rejects a Slot that overlaps a Booking, wholly or partly', () => {
    expect(check('2026-11-03T10:00:00', 60)).toBe('unavailable');
    expect(check('2026-11-03T10:30:00', 30)).toBe('unavailable');
    expect(check('2026-11-03T09:30:00', 45)).toBe('unavailable');
  });

  test('rejects a Slot that has started, including one that starts now', () => {
    expect(check('2026-11-02T09:00:00', 30)).toBe('started');
    expect(check('2026-11-02T10:00:00', 30)).toBe('started');
    expect(check('2026-11-01T09:00:00', 30)).toBe('started');
  });

  test('checks the start before whether it has started, and that before overlaps', () => {
    expect(check('2026-11-02T09:10:00', 30)).toBe('off-grid');
    expect(check('2026-11-03T10:10:00', 30)).toBe('off-grid');
    expect(
      checkBooking({
        startsAt: moscow('2026-11-02T10:00:00'),
        durationMinutes: 30,
        now,
        bookings: [
          { startsAt: moscow('2026-11-02T10:00:00'), endsAt: moscow('2026-11-02T10:30:00') },
        ],
      }),
    ).toBe('started');
  });
});

/** A Booking named `id` from one Moscow wall time to another. */
function namedBooking(id: string, startsAt: string, endsAt: string) {
  return { id, startsAt: moscow(startsAt), endsAt: moscow(endsAt) };
}

describe('Upcoming Bookings', () => {
  test('go nearest first and keep their own fields', () => {
    const later = namedBooking('later', '2026-11-04T09:00:00', '2026-11-04T09:30:00');
    const nearest = namedBooking('nearest', '2026-11-02T15:00:00', '2026-11-02T16:00:00');
    const middle = namedBooking('middle', '2026-11-03T12:00:00', '2026-11-03T12:15:00');

    expect(upcoming([later, nearest, middle], now).map(({ id }) => id)).toEqual([
      'nearest',
      'middle',
      'later',
    ]);
  });

  test('keep a call until the moment it ends, then drop it', () => {
    const ended = namedBooking('ended', '2026-11-02T09:00:00', '2026-11-02T09:30:00');
    const endsNow = namedBooking('ends-now', '2026-11-02T09:30:00', '2026-11-02T10:00:00');
    const inProgress = namedBooking('in-progress', '2026-11-02T10:00:00', '2026-11-02T10:15:00');
    const ids = (at: Date) => upcoming([ended, endsNow, inProgress], at).map(({ id }) => id);

    expect(ids(now)).toEqual(['in-progress']);
    expect(ids(moscow('2026-11-02T09:59:59.999'))).toEqual(['ends-now', 'in-progress']);
  });
});
