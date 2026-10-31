import { Alert, Anchor, Box, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';

import {
  getEventTypeOptions,
  getOwnerOptions,
} from '../api/generated/@tanstack/react-query.gen.ts';
import type { GetEventTypeError } from '../api/generated/index.ts';
import { FreeSlotsCalendar } from '../components/FreeSlotsCalendar.tsx';
import { formatDuration } from '../duration.ts';

function EventTypeNotFound() {
  return (
    <Stack align="flex-start" py="xl">
      <Title order={1}>Тип события не найден</Title>
      <Anchor component={Link} to="/book">
        К списку типов событий
      </Anchor>
    </Stack>
  );
}

/** The booking page of one Event Type, `/book/{id}`; the Owner can send its link to a Guest. */
export function EventTypePage() {
  const { id = '' } = useParams();
  const { data: owner } = useQuery(getOwnerOptions());
  const { data: eventType, error } = useQuery(getEventTypeOptions({ path: { id } }));

  // The error is the parsed `ApiError` body, unless the request did not reach the server at all.
  const { code, message } = (error ?? {}) as Partial<GetEventTypeError>;
  if (code === 'NOT_FOUND') {
    return <EventTypeNotFound />;
  }

  return (
    <>
      <Title order={1} py="xl">
        {owner === undefined ? 'Запись на звонок' : `Запись на звонок: ${owner.name}`}
      </Title>

      {error !== null && <Alert color="red">{message ?? 'Не удалось загрузить тип события'}</Alert>}

      {eventType !== undefined && (
        <Stack gap="xs">
          <Title order={2}>{eventType.name}</Title>
          <Text c="dimmed">{formatDuration(eventType.durationMinutes)}</Text>
          {eventType.description !== undefined && <Text>{eventType.description}</Text>}
        </Stack>
      )}

      {eventType !== undefined && owner !== undefined && (
        <Box pt="xl">
          <FreeSlotsCalendar eventTypeId={eventType.id} timeZone={owner.timeZone} />
        </Box>
      )}
    </>
  );
}
