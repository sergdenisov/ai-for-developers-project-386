import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { AppRoutes } from '../App.tsx';

/** Renders the app at `path` with a fresh query cache. */
export function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MantineProvider env="test">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}
