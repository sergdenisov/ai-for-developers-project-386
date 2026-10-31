import { List, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { listEventTypesOptions } from '../api/generated/@tanstack/react-query.gen.ts';

export function EventTypeList() {
  const { data: eventTypes } = useQuery(listEventTypesOptions());

  if (eventTypes === undefined) {
    return null;
  }

  if (eventTypes.length === 0) {
    return <Text c="dimmed">Типов событий пока нет</Text>;
  }

  return (
    <List>
      {eventTypes.map((eventType) => (
        <List.Item key={eventType.id}>{eventType.name}</List.Item>
      ))}
    </List>
  );
}
