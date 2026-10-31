/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The SDK calls `/api` on the page's origin; the dev server and `vite preview` pass it on to the backend.
const proxy = {
  '/api': `http://127.0.0.1:${process.env.BACKEND_PORT ?? 3000}`,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
