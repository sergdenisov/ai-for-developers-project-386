import type { WorkingHours } from './api/generated/index.ts';

/** The step of the Slot Grid; an Event Type lasts a whole number of steps. */
const SLOT_GRID_MINUTES = 15;

function minutesOfDay(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Event Type durations: 15-minute steps up to the length of Working Hours, the longest a Slot can be. */
export function durationsWithin({ start, end }: WorkingHours): number[] {
  const longest = minutesOfDay(end) - minutesOfDay(start);
  return Array.from(
    { length: Math.floor(longest / SLOT_GRID_MINUTES) },
    (_, index) => (index + 1) * SLOT_GRID_MINUTES,
  );
}

/** A duration for people: `45 мин`, `1 ч`, `1 ч 30 мин`. */
export function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 && `${hours} ч`, minutes > 0 && `${minutes} мин`].filter(Boolean).join(' ');
}
