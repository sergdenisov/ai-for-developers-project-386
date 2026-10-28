import '@mantine/core/styles.css';

import { Button, Container, MantineProvider, Stack, Text, Title } from '@mantine/core';

function App() {
  return (
    <MantineProvider>
      <Container size="sm" py="xl">
        <Stack align="flex-start">
          <Title order={1}>Календарь звонков</Title>
          <Text c="dimmed">Сервис для бронирования времени в календаре</Text>
          <Button>Записаться</Button>
        </Stack>
      </Container>
    </MantineProvider>
  );
}

export default App;
