import { Anchor, Stack, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack align="flex-start" py="xl">
      <Title order={1}>Страница не найдена</Title>
      <Anchor component={Link} to="/">
        На главную
      </Anchor>
    </Stack>
  );
}
