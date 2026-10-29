import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
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

function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
