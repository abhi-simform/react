import { expect, test as base, type Page } from "@playwright/test"

export const API = "http://localhost:4000/api/v1"
export const CUSTOMER = {
  email: "customer@shopsphere.dev",
  password: "Password123",
}

let counter = 0
const nextIp = () => {
  counter++
  return `10.${Math.floor(counter / 250) % 250}.${counter % 250}.${1 + (Date.now() % 250)}`
}

/**
 * Every spec imports `test` from here. Two fixtures:
 *
 * - `clientIp` (automatic): the API rate-limits PER IP (300 requests/min, and 30 per 15 minutes for
 *   /auth/*), and the whole suite comes from one address, so a fast run exhausts it and the last
 *   tests fail with 429 (seen with the production build). The API trusts one proxy hop
 *   (`trust proxy 1`), so each test's API calls carry their own `X-Forwarded-For`: every test gets
 *   its own bucket, as real users on different addresses would. (Added by `route.continue`, i.e.
 *   below CORS: a header set in the page would need a preflight.)
 * - `signedIn`: a page whose browser context already has a session. Playwright's `storageState`
 *   would save ONE refresh cookie and reuse it, but the API ROTATES that cookie on use and revokes
 *   the whole session when an old one is replayed (reuse detection, Stage 10): the second test
 *   would be signed out. So each test logs in through the API in its OWN context (one request) and
 *   the app restores the session on load; the login UI itself is covered once, in auth.spec.ts.
 */
export const test = base.extend<{ clientIp: string; signedIn: Page }>({
  clientIp: [
    async ({ context }, use) => {
      const ip = nextIp()
      await context.route("**/api/v1/**", (route) =>
        route.continue({
          headers: { ...route.request().headers(), "x-forwarded-for": ip },
        })
      )
      await use(ip)
    },
    { auto: true },
  ],
  signedIn: async ({ page, context, clientIp }, use) => {
    const res = await context.request.post(`${API}/auth/login`, {
      data: CUSTOMER,
      headers: { "x-forwarded-for": clientIp },
    })
    expect(res.ok()).toBe(true)
    // The same hint the app writes after a login: "a session probably exists, ask the API".
    await context.addInitScript(() =>
      localStorage.setItem("shopsphere.hasSession", "true")
    )
    await use(page)
  },
})

export { expect }
