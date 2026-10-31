import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../spec/openapi.yaml',
  output: {
    path: 'src/api/generated',
    // Copy of the contract for fastify-openapi-glue: the backend does not read ../spec at runtime.
    source: { fileName: 'openapi' },
    // Format with the repository's oxfmt settings, so the formatter needs no exception for generated code.
    postProcess: ['oxfmt'],
  },
  plugins: ['@hey-api/typescript', 'fastify'],
});
