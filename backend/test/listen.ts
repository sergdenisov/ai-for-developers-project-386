import type { FastifyInstance } from 'fastify';

export type RunningApp = {
  url: (path: string) => string;
  close: () => Promise<void>;
};

/** Starts the app on a random port so that tests send real HTTP requests to it. */
export async function listen(app: FastifyInstance): Promise<RunningApp> {
  await app.listen({ port: 0, host: '127.0.0.1' });

  const address = app.server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Server is not listening on a TCP port');
  }

  return {
    url: (path) => `http://127.0.0.1:${address.port}${path}`,
    close: () => app.close(),
  };
}
