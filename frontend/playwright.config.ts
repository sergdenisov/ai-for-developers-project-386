import { defineConfig, devices } from '@playwright/test';

// Ports of the servers under test; they differ from the dev servers' (BACKEND_PORT and FRONTEND_PORT in mise.toml),
// so the browser tests run while the dev daemons are up.
const backendPort = 3100;
const previewPort = 4173;

/**
 * Browser scenarios against the real server: the built backend with response validation and `vite preview`, whose
 * proxy passes `/api` to that backend. Run them with `mise run check:e2e`, which builds both first.
 */
export default defineConfig({
  testDir: './e2e',
  // One server with one in-memory store for the whole run: all Event Types share one calendar, so tests run one at
  // a time. Each test makes its own Event Types and Bookings and assumes nothing about what is already there.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    // A browser zone far from the Owner Time Zone, so that times shown in the browser's zone fail the tests.
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The built backend (`node dist/server.js`); a response that breaks the contract becomes a 500.
      command: 'npm start --prefix ../backend -- --validate-responses',
      url: `http://127.0.0.1:${backendPort}/api/owner`,
      env: { PORT: String(backendPort), HOST: '127.0.0.1' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
      url: `http://127.0.0.1:${previewPort}`,
      // Read by the `/api` proxy in vite.config.ts.
      env: { BACKEND_PORT: String(backendPort) },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
