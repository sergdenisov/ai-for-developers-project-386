import { Group, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';

import { getOwnerOptions } from '../api/generated/@tanstack/react-query.gen.ts';
import { CreateEventTypeForm } from '../components/CreateEventTypeForm.tsx';
import { EventTypeList } from '../components/EventTypeList.tsx';
import { UpcomingBookingsTable } from '../components/UpcomingBookingsTable.tsx';

export function AdminPage() {
  const { data: owner } = useQuery(getOwnerOptions());
  const upcomingHeadingId = useId();

  return (
    <>
      <Group component="header" justify="space-between" align="baseline" py="xl">
        <Title order={1}>Админка</Title>
        {owner !== undefined && <Text c="dimmed">{owner.name}</Text>}
      </Group>

      <Stack gap="xl">
        <Stack gap="sm">
          <Title order={2} id={upcomingHeadingId}>
            Предстоящие встречи
          </Title>
          {owner !== undefined && (
            <UpcomingBookingsTable timeZone={owner.timeZone} labelledBy={upcomingHeadingId} />
          )}
        </Stack>

        <Stack gap="sm">
          <Title order={2}>Типы событий</Title>
          <EventTypeList />
        </Stack>

        <Stack gap="sm">
          <Title order={2}>Новый тип события</Title>
          {owner !== undefined && <CreateEventTypeForm workingHours={owner.workingHours} />}
        </Stack>
      </Stack>
    </>
  );
}
