import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderApp } from './test/render-app.tsx';

test('home page links to booking and the admin area', () => {
  renderApp('/');

  const header = within(screen.getByRole('banner'));
  expect(header.getByRole('link', { name: 'Записаться' }).getAttribute('href')).toBe('/book');
  expect(header.getByRole('link', { name: 'Админка' }).getAttribute('href')).toBe('/admin');

  const main = within(screen.getByRole('main'));
  expect(main.getByRole('link', { name: 'Записаться' }).getAttribute('href')).toBe('/book');
});
