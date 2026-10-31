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
export type Interval = { startsAt: Date; endsAt: Date };

/**
 * Two periods overlap when each starts before the other ends, whatever their Event Types. Periods are half-open, so
 * one that starts exactly when the other ends does not overlap it.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

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

/** The end of a Slot of this duration that starts at `startsAt`. */
export function slotEnd(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * MINUTE_MS);
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
    slots.push({ startsAt, endsAt: slotEnd(startsAt, durationMinutes) });
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

/**
 * Whether a new Booking may take the Slot, or the first rule it breaks, in the order the API reports them: a start
 * that can never begin a Slot, then a Slot that has started, then one that overlaps a Booking of any Event Type.
 */
export type BookingCheck = StartCheck | 'started' | 'unavailable';

export function checkBooking({
  startsAt,
  durationMinutes,
  now,
  bookings,
}: {
  startsAt: Date;
  durationMinutes: number;
  now: Date;
  bookings: readonly Interval[];
}): BookingCheck {
  const start = checkStart({ startsAt, durationMinutes, now });
  if (start !== 'valid') {
    return start;
  }
  if (hasStarted(startsAt, now)) {
    return 'started';
  }
  const slot = { startsAt, endsAt: slotEnd(startsAt, durationMinutes) };
  if (bookings.some((booking) => overlaps(slot, booking))) {
    return 'unavailable';
  }
  return 'valid';
}

/**
 * The Free Slots of an Event Type of this duration on every day of the Booking Window: the Slots that have not
 * started and overlap none of the Bookings, of any Event Type.
 */
export function freeSlots({
  now,
  durationMinutes,
  bookings,
}: {
  now: Date;
  durationMinutes: number;
  bookings: readonly Interval[];
}): FreeSlots {
  const window = bookingWindow(now);
  const days = Array.from({ length: owner.bookingWindowDays }, (_, index) => {
    const date = addDays(window.firstDate, index);
    return {
      date,
      slots: slotsOn(date, durationMinutes).filter(
        (slot) => !hasStarted(slot.startsAt, now) && !bookings.some((b) => overlaps(slot, b)),
      ),
    };
  });
  return { window, days };
}
