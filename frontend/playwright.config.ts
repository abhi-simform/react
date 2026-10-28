import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

/**
 * Stage 12.6. The suite runs against the REAL stack: the Express API (port 4000, MongoDB from
 * docker compose, Mailpit on 8025) and the Vite dev server (5173). Playwright starts what is
 * not running yet; `global-setup.ts` resets and seeds the database so every run starts from
 * the same data.
 *
 * One worker: the specs share one database and the one seeded customer (cart, orders), and
 * the API's auth rate limiter (30 per 15 minutes) is not meant for parallel logins.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5173",
    // A trace of the failed test's first retry (CI) and, locally, of every failure.
    trace: CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      // A PRODUCTION build, not `vite dev`: the dev server optimises dependencies on first use
      // and RELOADS the page mid-test (flaky), and the build is what users get. The Vite env
      // (VITE_API_URL) is read from .env.local at build time.
      command: "npm run build && npm start",
      env: { PORT: "5173" },
      url: "http://localhost:5173",
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // An iPhone profile (viewport, touch, user agent) on the Chromium we have installed:
      // the cart drawer and sticky buy bar are layout behaviour, not WebKit behaviour.
      name: "mobile",
      use: { ...devices["iPhone 14"], defaultBrowserType: "chromium" },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
})
