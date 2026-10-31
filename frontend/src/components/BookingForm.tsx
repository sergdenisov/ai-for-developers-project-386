import { Alert, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { createBookingMutation } from '../api/generated/@tanstack/react-query.gen.ts';
import type { Booking, EventType, Slot } from '../api/generated/index.ts';
import { formatDuration } from '../duration.ts';
import { apiErrorOf, requiredMessage, unexpectedMessage } from '../errors.ts';
import { formatSlot } from '../owner-time.ts';

type Values = { guest: { name: string; email: string } };

/**
 * The Guest's form for a chosen Slot. Only required fields are checked here; the server checks the rest, and its
 * field messages are shown next to their fields. A Slot that has started or been taken in the meantime is handed
 * back with the server's message.
 */
export function BookingForm({
  eventType,
  slot,
  timeZone,
  onBooked,
  onSlotLost,
  onBack,
}: {
  eventType: EventType;
  slot: Slot;
  timeZone: string;
  onBooked: (booking: Booking) => void;
  /** The Slot is no longer free: it has started or someone has booked overlapping time. */
  onSlotLost: (message: string) => void;
  onBack: () => void;
}) {
  const headingId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    initialValues: { guest: { name: '', email: '' } },
    validate: { guest: { name: isNotEmpty(requiredMessage), email: isNotEmpty(requiredMessage) } },
  });

  const book = useMutation({
    ...createBookingMutation(),
    onSuccess: onBooked,
    onError: (error) => {
      const { code, message, fields } = apiErrorOf(error);
      if ((code === 'SLOT_STARTED' || code === 'SLOT_UNAVAILABLE') && message !== undefined) {
        onSlotLost(message);
      } else {
        // The keys are the form's own paths: `guest.name`, `guest.email`.
        form.setErrors(fields ?? {});
        // An error that belongs to no field of the form, such as the start, goes above the button.
        if (fields?.['guest.name'] === undefined && fields?.['guest.email'] === undefined) {
          setFormError(fields?.startsAt ?? message ?? unexpectedMessage);
        }
      }
    },
  });

  const submit = form.onSubmit(({ guest }) => {
    setFormError(null);
    book.mutate({ body: { eventTypeId: eventType.id, startsAt: slot.startsAt, guest } });
  });

  return (
    <Stack component="section" aria-labelledby={headingId} gap="md" maw={480}>
      <Title order={3} id={headingId}>
        Подтверждение записи
      </Title>
      <Stack gap={0}>
        <Text fw={500}>{eventType.name}</Text>
        <Text>{formatSlot(slot, timeZone)}</Text>
        <Text c="dimmed">{formatDuration(eventType.durationMinutes)}</Text>
      </Stack>
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <TextInput label="Имя" withAsterisk {...form.getInputProps('guest.name')} />
          <TextInput
            label="Email"
            type="email"
            withAsterisk
            {...form.getInputProps('guest.email')}
          />
          {formError !== null && <Alert color="red">{formError}</Alert>}
          <Group>
            <Button type="submit" loading={book.isPending}>
              Подтвердить запись
            </Button>
            <Button variant="subtle" onClick={onBack} disabled={book.isPending}>
              Выбрать другое время
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
