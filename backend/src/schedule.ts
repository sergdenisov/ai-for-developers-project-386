import { addDays, ownerDate, ownerInstant, ownerMinuteOfDay } from './owner-time.js';
import { owner } from './owner.js';

/**
 * The scheduling rules: Working Hours, the Slot Grid, the Booking Window and Free Slots. Pure functions: the
 * current moment comes in as `now`, nothing here reads the system clock or knows about HTTP.
 */

const MINUTE_MS = 60_000;
const SLOT_GRID_MINUTES = 15;

function minuteOfDay(wallTime: string): number {
  const [hours = 0, minutes = 0] = wallTime.split(':').map(Number);
  return hours * 60 + minutes;
}

const workingHours = {
  start: minuteOfDay(owner.workingHours.start),
  end: minuteOfDay(owner.workingHours.end),
};

/** A period of time, half-open: `[startsAt, endsAt)`. */
type Interval = { startsAt: Date; endsAt: Date };

/** The days a Guest can book: today in the Owner Time Zone and the days after it. */
export type BookingWindow = { firstDate: string; lastDate: string };

export type FreeSlots = {
  window: BookingWindow;
  /** Every day of the window in order; a day without Free Slots has none. */
  days: { date: string; slots: Interval[] }[];
};

export function bookingWindow(now: Date): BookingWindow {
  const firstDate = ownerDate(now);
  return { firstDate, lastDate: addDays(firstDate, owner.bookingWindowDays - 1) };
}

/** The Slots of an Event Type of this duration on the date, in order. */
function slotsOn(date: string, durationMinutes: number): Interval[] {
  const slots: Interval[] = [];
  for (
    let start = workingHours.start;
    start + durationMinutes <= workingHours.end;
    start += SLOT_GRID_MINUTES
  ) {
    const startsAt = ownerInstant(date, start);
    slots.push({ startsAt, endsAt: new Date(startsAt.getTime() + durationMinutes * MINUTE_MS) });
  }
  return slots;
}

/**
 * Why a start cannot begin a Slot of this duration, or `valid`. A start before today is valid here: it is a Slot
 * that has started, see `hasStarted`.
 */
export type StartCheck = 'valid' | 'off-grid' | 'outside-working-hours' | 'after-window';

export function checkStart({
  startsAt,
  durationMinutes,
  now,
}: {
  startsAt: Date;
  durationMinutes: number;
  now: Date;
}): StartCheck {
  const start = ownerMinuteOfDay(startsAt);
  if ((start - workingHours.start) % SLOT_GRID_MINUTES !== 0) {
    return 'off-grid';
  }
  if (start < workingHours.start || start + durationMinutes > workingHours.end) {
    return 'outside-working-hours';
  }
  // `YYYY-MM-DD` strings compare as dates.
  if (ownerDate(startsAt) > bookingWindow(now).lastDate) {
    return 'after-window';
  }
  return 'valid';
}

/** A Slot has started once its start is not later than now: one that starts exactly now has started. */
function hasStarted(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() <= now.getTime();
}

/** The Free Slots of an Event Type of this duration on every day of the Booking Window. */
export function freeSlots({
  now,
  durationMinutes,
}: {
  now: Date;
  durationMinutes: number;
}): FreeSlots {
  const window = bookingWindow(now);
  const days = Array.from({ length: owner.bookingWindowDays }, (_, index) => {
    const date = addDays(window.firstDate, index);
    return {
      date,
      slots: slotsOn(date, durationMinutes).filter(({ startsAt }) => !hasStarted(startsAt, now)),
    };
  });
  return { window, days };
}
