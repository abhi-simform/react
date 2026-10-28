import { expect, test as base, type Page } from "@playwright/test"

export const API = "http://localhost:4000/api/v1"
export const CUSTOMER = {
  email: "customer@shopsphere.dev",
  password: "Password123",
}

/**
 * `signedIn`: a page whose browser context already has a session.
 *
 * Playwright's `storageState` would save ONE refresh cookie and reuse it for every test, but
 * the API ROTATES that cookie on use and revokes the whole session when an old one is replayed
 * (reuse detection, Stage 10). The second test would be signed out. So each test logs in through
 * the API in its OWN context (one request) and the app restores the session on load; the login
 * UI itself is covered once, in auth.spec.ts.
 */
export const test = base.extend<{ signedIn: Page }>({
  signedIn: async ({ page, context }, use) => {
    const res = await context.request.post(`${API}/auth/login`, {
      data: CUSTOMER,
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
