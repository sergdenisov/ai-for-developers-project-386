import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { AppRoutes } from '../App.tsx';
import { createQueryClient } from '../query-client.ts';

/** Renders the app at `path` with a fresh query cache that retries like the app, only without delays. */
export function renderApp(path: string) {
  const queryClient = createQueryClient({ retryDelay: 0 });

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
