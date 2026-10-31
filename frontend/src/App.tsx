import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AppLayout } from './layouts/AppLayout.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { BookPage } from './pages/BookPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="book" element={<BookPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

export default App;
