import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { client } from '../api/generated/client.gen.ts';
import { server } from './server.ts';

// A browser resolves the SDK's relative base URL `/api` against the page; Node's fetch needs an absolute one.
client.setConfig({ baseUrl: new URL('/api', window.location.origin).href });

/** Requests the current test made that no handler answered. */
let unhandledRequests: string[] = [];

beforeAll(() => {
  server.listen({
    // MSW's 'error' strategy only logs and fails the fetch, which a query swallows; collect them to fail the test.
    onUnhandledFrame: ({ frame, defaults }) => {
      defaults.error();
      const { request } = frame.data as { request: Request };
      unhandledRequests.push(`${request.method} ${new URL(request.url).pathname}`);
    },
  });
});

afterEach(() => {
  const unhandled = unhandledRequests;
  unhandledRequests = [];
  cleanup();
  server.resetHandlers();
  if (unhandled.length > 0) {
    throw new Error(`Requests without an MSW handler: ${unhandled.join(', ')}`);
  }
});

afterAll(() => {
  server.close();
});

// jsdom lacks browser APIs that Mantine uses: https://mantine.dev/guides/vitest/
const noop = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
