import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

/**
 * A.8. Runs against the REAL stack: the API (4000, MongoDB from docker compose), the admin dev server (3000) and
 * the storefront (5173, a production build). Playwright starts what is not running yet; `global-setup.ts` resets
 * and seeds the database so every run starts from the same data.
 *
 * One worker: the specs share one database and the API's in-memory auth rate limiter (30 logins / 15 min).
 * Both apps use `localhost`, so they SHARE the refresh cookie: every test that needs the storefront opens it in
 * its OWN browser context (a separate cookie jar), exactly like using two browser profiles by hand.
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
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
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
      command: "npm run dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      // A production build of the storefront (the dev server reloads mid-test while it optimises dependencies).
      command: "npm run build && npm start",
      cwd: "../frontend",
      env: { PORT: "5173" },
      url: "http://localhost:5173",
      reuseExistingServer: !CI,
      timeout: 240_000,
    },
  ],
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
})
