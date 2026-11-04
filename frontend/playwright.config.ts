import { defineConfig, devices } from '@playwright/test';

// The port of the server under test; it differs from the dev servers' (BACKEND_PORT and FRONTEND_PORT in mise.toml),
// so the browser tests run while the dev daemons are up.
const port = 3100;

/**
 * Browser scenarios against the real server: the built backend with response validation, serving the built frontend
 * as the Docker image does. Run them with `mise run check:e2e`, which builds both first.
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
    baseURL: `http://127.0.0.1:${port}`,
    // A browser zone far from the Owner Time Zone, so that times shown in the browser's zone fail the tests.
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A response that breaks the contract becomes a 500.
    command:
      'npm start --prefix ../backend -- --validate-responses --frontend-dir ../frontend/dist',
    url: `http://127.0.0.1:${port}/api/owner`,
    env: { PORT: String(port), HOST: '127.0.0.1' },
    reuseExistingServer: !process.env.CI,
  },
});
