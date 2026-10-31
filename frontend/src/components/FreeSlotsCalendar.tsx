import { Alert, Group, List, Stack, Text, Title } from '@mantine/core';
import { DatePicker, DatesProvider } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { getFreeSlotsOptions } from '../api/generated/@tanstack/react-query.gen.ts';
import type { FreeSlotsDay, GetFreeSlotsError } from '../api/generated/index.ts';
import { formatDate, formatTime, zoneLabel } from '../owner-time.ts';

function DaySlots({ day, timeZone }: { day: FreeSlotsDay; timeZone: string }) {
  const headingId = useId();
  return (
    <Stack gap="xs">
      <Title order={3} id={headingId}>
        {`${formatDate(day.date)}, время ${zoneLabel(timeZone)}`}
      </Title>
      <List aria-labelledby={headingId} listStyleType="none">
        {day.slots.map(({ startsAt, endsAt }) => (
          <List.Item key={startsAt}>
            {`${formatTime(startsAt, timeZone)}–${formatTime(endsAt, timeZone)}`}
          </List.Item>
        ))}
      </List>
    </Stack>
  );
}

/**
 * The Booking Window as a calendar: days without Free Slots are disabled, a chosen day lists its Free Slots in the
 * Owner Time Zone. The window comes from the server; the browser never works out "today" itself.
 */
export function FreeSlotsCalendar({
  eventTypeId,
  timeZone,
}: {
  eventTypeId: string;
  timeZone: string;
}) {
  const { data, error } = useQuery(getFreeSlotsOptions({ path: { id: eventTypeId } }));
  const [date, setDate] = useState<string | null>(null);

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
          onChange={setDate}
          defaultDate={window.firstDate}
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
        <DaySlots day={chosenDay} timeZone={timeZone} />
      )}
    </Group>
  );
}
