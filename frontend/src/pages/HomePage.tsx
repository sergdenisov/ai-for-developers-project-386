import { Button, List, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

const steps = ['Выберите тип события', 'Выберите день и свободный слот', 'Укажите имя и почту'];

export function HomePage() {
  return (
    <Stack gap="xl" py="xl">
      <Stack align="flex-start" gap="md">
        <Title order={1}>Календарь звонков</Title>
        <Text size="lg">Выберите тип события и свободный слот — запись займёт меньше минуты</Text>
        <Button component={Link} to="/book" size="lg">
          Записаться
        </Button>
      </Stack>

      <Stack gap="sm">
        <Title order={2}>Как это работает</Title>
        <List type="ordered" spacing="xs">
          {steps.map((step) => (
            <List.Item key={step}>{step}</List.Item>
          ))}
        </List>
        <Text size="sm" c="dimmed">
          Запись открыта на 14 дней вперёд, время московское, регистрация не нужна
        </Text>
      </Stack>
    </Stack>
  );
}
