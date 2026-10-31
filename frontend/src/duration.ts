import type { WorkingHours } from './api/generated/index.ts';

const step = 15;

function minutesOfDay(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Event Type durations: 15-minute steps up to the length of Working Hours, the longest a Slot can be. */
export function durationsWithin({ start, end }: WorkingHours): number[] {
  const longest = minutesOfDay(end) - minutesOfDay(start);
  return Array.from({ length: Math.floor(longest / step) }, (_, index) => (index + 1) * step);
}

/** A duration for people: `45 мин`, `1 ч`, `1 ч 30 мин`. */
export function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 && `${hours} ч`, minutes > 0 && `${minutes} мин`].filter(Boolean).join(' ');
}
