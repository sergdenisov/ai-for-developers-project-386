import { fileURLToPath } from 'node:url';

import { defineConfig } from '@hey-api/openapi-ts';

// openapi-ts resolves a relative `tsConfigPath` against its own install directory, so pass an absolute one.
const tsConfig = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The generator lives here, not in backend and frontend: it needs the TypeScript compiler API, which
// TypeScript 7 in those packages no longer ships. The output imports nothing but `fastify` types (backend) and
// `@tanstack/react-query` (frontend); the fetch client is copied into the frontend output.
export default defineConfig([
  {
    input: './openapi.yaml',
    output: {
      path: '../backend/src/api/generated',
      // Module resolution of the target package decides the import extensions (`.js` for nodenext).
      tsConfigPath: tsConfig('../backend/tsconfig.json'),
      // Copy of the contract for fastify-openapi-glue: the backend does not read ../spec at runtime.
      source: { fileName: 'openapi' },
      // Format with the repository's oxfmt settings, so the formatter needs no exception for generated code.
      postProcess: ['oxfmt'],
    },
    plugins: ['@hey-api/typescript', 'fastify'],
  },
  {
    input: './openapi.yaml',
    output: {
      path: '../frontend/src/api/generated',
      tsConfigPath: tsConfig('../frontend/tsconfig.app.json'),
      postProcess: ['oxfmt'],
    },
    plugins: [
      // Same origin: Vite proxies /api to the backend in dev and in preview.
      { name: '@hey-api/client-fetch', baseUrl: '/api' },
      '@tanstack/react-query',
    ],
  },
]);
