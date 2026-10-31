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
export function formatTime(moment: string, timeZone: string) {
  return dayjs(moment).tz(timeZone).format('HH:mm');
}

/** A calendar day `YYYY-MM-DD` for people: `3 ноября`. */
export function formatDate(date: string) {
  return dayjs(date).locale('ru').format('D MMMM');
}

/** A Slot for people, in the zone and labelled with it: `3 ноября, 10:00–10:30 МСК`. */
export function formatSlot(
  { startsAt, endsAt }: { startsAt: string; endsAt: string },
  timeZone: string,
) {
  const date = dayjs(startsAt).tz(timeZone).locale('ru').format('D MMMM');
  return `${date}, ${formatTime(startsAt, timeZone)}–${formatTime(endsAt, timeZone)} ${zoneLabel(timeZone)}`;
}
