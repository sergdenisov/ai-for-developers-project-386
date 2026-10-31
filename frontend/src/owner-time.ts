import dayjs from 'dayjs';
import ru from 'dayjs/locale/ru';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
// Registers the Russian locale for dates in Russian, here and in Mantine's calendar (`DatesProvider locale="ru"`),
// without changing the global default.
dayjs.locale(ru, undefined, true);

/**
 * Times are shown in the Owner Time Zone from `GET /owner`, never in the browser's zone (ADR 0002), and labelled
 * with the zone's short name.
 */

const zoneLabels: Record<string, string> = { 'Europe/Moscow': 'МСК' };

/** The short name of the zone for people: `МСК`. */
export function zoneLabel(timeZone: string) {
  return zoneLabels[timeZone] ?? timeZone;
}

/** The wall-clock time of the moment in the zone: `10:00`. */
function formatTime(moment: string, timeZone: string) {
  return dayjs(moment).tz(timeZone).format('HH:mm');
}

/** A calendar day `YYYY-MM-DD` for people: `3 ноября`. */
export function formatDate(date: string) {
  return dayjs(date).locale('ru').format('D MMMM');
}

/** The short date of the moment in the zone, for tables: `2 нояб.`. */
function formatShortDate(moment: string, timeZone: string) {
  return dayjs(moment).tz(timeZone).locale('ru').format('D MMM');
}

/** A moment in the zone for tables, where the zone is in the column header: `30 окт., 18:45`. */
export function formatShortMoment(moment: string, timeZone: string) {
  return `${formatShortDate(moment, timeZone)}, ${formatTime(moment, timeZone)}`;
}

/** The wall-clock times a Slot spans in the zone: `10:00–10:30`. */
export function formatTimeRange(
  { startsAt, endsAt }: { startsAt: string; endsAt: string },
  timeZone: string,
) {
  return `${formatTime(startsAt, timeZone)}–${formatTime(endsAt, timeZone)}`;
}

/** A Slot in the zone for tables, where the zone is in the column header: `2 нояб., 10:00–10:30`. */
export function formatShortSlot(slot: { startsAt: string; endsAt: string }, timeZone: string) {
  return `${formatShortDate(slot.startsAt, timeZone)}, ${formatTimeRange(slot, timeZone)}`;
}

/** A Slot for people, in the zone and labelled with it: `3 ноября, 10:00–10:30 МСК`. */
export function formatSlot(slot: { startsAt: string; endsAt: string }, timeZone: string) {
  const date = dayjs(slot.startsAt).tz(timeZone).format('YYYY-MM-DD');
  return `${formatDate(date)}, ${formatTimeRange(slot, timeZone)} ${zoneLabel(timeZone)}`;
}
