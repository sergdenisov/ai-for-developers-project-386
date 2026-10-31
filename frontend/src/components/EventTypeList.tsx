import { Anchor, Group, List, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { listEventTypesOptions } from '../api/generated/@tanstack/react-query.gen.ts';
import { formatDuration } from '../duration.ts';

export function EventTypeList() {
  const { data: eventTypes } = useQuery(listEventTypesOptions());

  if (eventTypes === undefined) {
    return null;
  }

  if (eventTypes.length === 0) {
    return <Text c="dimmed">Типов событий пока нет</Text>;
  }

  return (
    <List listStyleType="none" spacing="md">
      {eventTypes.map((eventType) => (
        <List.Item key={eventType.id}>
          <Stack gap={2}>
            <Group gap="sm" align="baseline">
              <Anchor component={Link} to={`/book/${eventType.id}`} fw={600}>
                {eventType.name}
              </Anchor>
              <Text size="sm" c="dimmed">
                {formatDuration(eventType.durationMinutes)}
              </Text>
            </Group>
            {eventType.description !== undefined && <Text size="sm">{eventType.description}</Text>}
          </Stack>
        </List.Item>
      ))}
    </List>
  );
}
