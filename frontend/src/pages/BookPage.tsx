import { Title } from '@mantine/core';

import { EventTypeList } from '../components/EventTypeList.tsx';

export function BookPage() {
  return (
    <>
      <Title order={1} py="xl">
        Записаться
      </Title>
      <EventTypeList />
    </>
  );
}
