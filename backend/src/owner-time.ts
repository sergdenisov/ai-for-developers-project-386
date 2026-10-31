import { owner } from './owner.js';

/**
 * Calendar days and wall-clock times in the Owner Time Zone (ADR 0002). Conversions go through the IANA zone, not a
 * fixed offset. A calendar day is `YYYY-MM-DD`; a time of day is minutes since midnight.
 */

export const MINUTE_MS = 60_000;

const wallClock = new Intl.DateTimeFormat('en-US', {
  timeZone: owner.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const offsetName = new Intl.DateTimeFormat('en-US', {
  timeZone: owner.timeZone,
  timeZoneName: 'longOffset',
});

type WallTime = { date: string; hour: string; minute: string; second: string };

function wallTime(instant: Date): WallTime {
  const parts = Object.fromEntries(
    wallClock.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parts.hour ?? '',
    minute: parts.minute ?? '',
    second: parts.second ?? '',
  };
}

/** The zone's UTC offset at the instant, `+03:00`. */
function utcOffset(instant: Date): string {
  const name = offsetName.formatToParts(instant).find(({ type }) => type === 'timeZoneName');
  // `GMT+03:00`, or a bare `GMT` for a zero offset.
  const offset = name?.value.slice('GMT'.length) ?? '';
  return offset === '' ? '+00:00' : offset;
}

function offsetMinutes(instant: Date): number {
  const offset = utcOffset(instant);
  const [hours = 0, minutes = 0] = offset.slice(1).split(':').map(Number);
  return (offset.startsWith('-') ? -1 : 1) * (hours * 60 + minutes);
}

/** The parts of a calendar day `YYYY-MM-DD`; the month is 1-12. */
function dateParts(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day };
}

/** The Owner's calendar day at the instant. */
export function ownerDate(instant: Date): string {
  return wallTime(instant).date;
}

/** Minutes since the Owner's midnight at the instant, with seconds as a fraction. */
export function ownerMinuteOfDay(instant: Date): number {
  const { hour, minute, second } = wallTime(instant);
  return (
    Number(hour) * 60 + Number(minute) + (Number(second) + instant.getUTCMilliseconds() / 1000) / 60
  );
}

/** The instant at which the Owner's clock shows the time of day on the date. */
export function ownerInstant(date: string, minuteOfDay: number): Date {
  const { year, month, day } = dateParts(date);
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  // The offset at the guess is right unless the zone changes its offset in between; a second pass settles that.
  const guess = new Date(asIfUtc - offsetMinutes(new Date(asIfUtc)) * MINUTE_MS);
  return new Date(asIfUtc - offsetMinutes(guess) * MINUTE_MS);
}

/** The calendar day `days` after the date. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = dateParts(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** RFC 3339 in the Owner Time Zone, to whole seconds: `2026-11-02T10:00:00+03:00`. */
export function formatOwnerInstant(instant: Date): string {
  const { date, hour, minute, second } = wallTime(instant);
  return `${date}T${hour}:${minute}:${second}${utcOffset(instant)}`;
}
