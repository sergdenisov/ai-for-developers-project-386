import { Button, Stack, Text, Title } from '@mantine/core';
import { useId } from 'react';

import type { Booking } from '../api/generated/index.ts';
import { formatDuration } from '../duration.ts';
import { formatSlot } from '../owner-time.ts';

/** What the Guest sees once the Booking exists: its Event Type, date, time and duration. */
export function BookingConfirmation({
  booking,
  durationMinutes,
  timeZone,
  onBookAnother,
}: {
  booking: Booking;
  durationMinutes: number;
  timeZone: string;
  onBookAnother: () => void;
}) {
  const headingId = useId();
  return (
    <Stack component="section" aria-labelledby={headingId} gap="md" align="flex-start">
      <Title order={3} id={headingId}>
        Запись подтверждена
      </Title>
      <Stack gap={0}>
        <Text fw={500}>{booking.eventType.name}</Text>
        <Text>{formatSlot(booking, timeZone)}</Text>
        <Text c="dimmed">{formatDuration(durationMinutes)}</Text>
      </Stack>
      <Button onClick={onBookAnother}>Записаться ещё</Button>
    </Stack>
  );
}
