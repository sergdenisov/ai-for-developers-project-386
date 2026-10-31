import { Title } from '@mantine/core';

import { EventTypeList } from '../components/EventTypeList.tsx';

export function AdminPage() {
  return (
    <>
      <Title order={1} py="xl">
        Админка
      </Title>
      <EventTypeList />
    </>
  );
}
