import { setupServer } from 'msw/node';

/** Stands in for the backend at the `fetch` level, so the generated SDK stays in the chain. Tests add handlers. */
export const server = setupServer();
