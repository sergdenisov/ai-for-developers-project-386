import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import { AppRoutes } from './App.tsx';

test('home page links to booking and the admin area', () => {
  render(
    <MantineProvider env="test">
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    </MantineProvider>,
  );

  const header = within(screen.getByRole('banner'));
  expect(header.getByRole('link', { name: 'Записаться' }).getAttribute('href')).toBe('/book');
  expect(header.getByRole('link', { name: 'Админка' }).getAttribute('href')).toBe('/admin');

  const main = within(screen.getByRole('main'));
  expect(main.getByRole('link', { name: 'Записаться' }).getAttribute('href')).toBe('/book');
});
