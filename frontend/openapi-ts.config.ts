import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../spec/openapi.yaml',
  output: {
    path: 'src/api/generated',
    // Format with the repository's oxfmt settings, so the formatter needs no exception for generated code.
    postProcess: ['oxfmt'],
  },
  plugins: [
    // Same origin: Vite proxies /api to the backend in dev and in preview.
    { name: '@hey-api/client-fetch', baseUrl: '/api' },
    '@tanstack/react-query',
  ],
});
