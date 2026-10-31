import { Alert, Button, Group, List, Stack, Text, Title } from '@mantine/core';
import { DatePicker, DatesProvider } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';

import { getFreeSlotsOptions } from '../api/generated/@tanstack/react-query.gen.ts';
import type { FreeSlotsDay, GetFreeSlotsError, Slot } from '../api/generated/index.ts';
import { formatDate, formatTime, zoneLabel } from '../owner-time.ts';

function DaySlots({
  day,
  timeZone,
  onSlotChoose,
}: {
  day: FreeSlotsDay;
  timeZone: string;
  onSlotChoose: (slot: Slot) => void;
}) {
  const headingId = useId();
  return (
    <Stack gap="xs">
      <Title order={3} id={headingId}>
        {`${formatDate(day.date)}, время ${zoneLabel(timeZone)}`}
      </Title>
      {day.slots.length === 0 && <Text c="dimmed">Свободного времени в этот день не осталось</Text>}
      <List aria-labelledby={headingId} listStyleType="none" spacing="xs">
        {day.slots.map((slot) => (
          <List.Item key={slot.startsAt}>
            <Button variant="default" onClick={() => onSlotChoose(slot)}>
              {`${formatTime(slot.startsAt, timeZone)}–${formatTime(slot.endsAt, timeZone)}`}
            </Button>
          </List.Item>
        ))}
      </List>
    </Stack>
  );
}

/**
 * The Booking Window as a calendar: days without Free Slots are disabled, a chosen day lists its Free Slots in the
 * Owner Time Zone as buttons. The window comes from the server; the browser never works out "today" itself.
 */
export function FreeSlotsCalendar({
  eventTypeId,
  timeZone,
  date,
  onDateChange,
  onSlotChoose,
}: {
  eventTypeId: string;
  timeZone: string;
  /** The chosen day, `YYYY-MM-DD`; it outlives the calendar, so that the Guest comes back to the same day. */
  date: string | null;
  onDateChange: (date: string | null) => void;
  onSlotChoose: (slot: Slot) => void;
}) {
  const { data, error } = useQuery(getFreeSlotsOptions({ path: { id: eventTypeId } }));

  if (error !== null) {
    // The error is the parsed `ApiError` body, unless the request did not reach the server at all.
    const { message } = error as Partial<GetFreeSlotsError>;
    return <Alert color="red">{message ?? 'Не удалось загрузить свободное время'}</Alert>;
  }
  if (data === undefined) {
    return null;
  }

  const { window, days } = data;
  const slotsByDate = new Map(days.map((day) => [day.date, day]));
  const chosenDay = date === null ? undefined : slotsByDate.get(date);
  // A window that runs into the next month shows both months side by side.
  const months = window.firstDate.slice(0, 7) === window.lastDate.slice(0, 7) ? 1 : 2;

  return (
    <Group align="flex-start" gap="xl">
      <DatesProvider settings={{ locale: 'ru' }}>
        <DatePicker
          value={date}
          onChange={onDateChange}
          defaultDate={date ?? window.firstDate}
          minDate={window.firstDate}
          maxDate={window.lastDate}
          numberOfColumns={months}
          hideOutsideDates
          excludeDate={(day) => (slotsByDate.get(day)?.slots.length ?? 0) === 0}
        />
      </DatesProvider>
      {chosenDay === undefined ? (
        <Text c="dimmed">Выберите день, чтобы увидеть свободное время</Text>
      ) : (
        <DaySlots day={chosenDay} timeZone={timeZone} onSlotChoose={onSlotChoose} />
      )}
    </Group>
  );
}
