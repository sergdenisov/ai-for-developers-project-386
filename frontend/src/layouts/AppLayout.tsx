import { Anchor, AppShell, Button, Container, Group } from '@mantine/core';
import { Link, NavLink, Outlet } from 'react-router';

const sections = [
  { to: '/book', label: 'Записаться' },
  { to: '/admin', label: 'Админка' },
];

export function AppLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="md" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Anchor component={Link} to="/" fw={700} c="inherit" underline="never">
              Календарь звонков
            </Anchor>
            <Group gap={4} wrap="nowrap">
              {sections.map(({ to, label }) => (
                <NavLink key={to} to={to}>
                  {({ isActive }) => (
                    <Button
                      component="span"
                      size="compact-md"
                      variant={isActive ? 'light' : 'subtle'}
                    >
                      {label}
                    </Button>
                  )}
                </NavLink>
              ))}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="md">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
