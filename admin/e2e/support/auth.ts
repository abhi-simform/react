import { expect, type APIRequestContext, type Page } from "@playwright/test"

export const PASSWORD = "Password123"

/** Sign in through the real login form. */
export async function signIn(
  page: Page,
  who: "admin" | "seller" | "seller2" | "customer",
  redirectTo = "/"
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirectTo)}`)
  await page.getByLabel("Email").fill(`${who}@shopsphere.dev`)
  await page.getByLabel("Password").fill(PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
}

export async function expectSignedInShell(page: Page) {
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()
}

/** A bearer token for direct API calls (never touches the browser's cookies). */
export async function apiToken(
  request: APIRequestContext,
  who: "admin" | "seller" | "seller2" | "customer"
) {
  const res = await request.post("http://localhost:4000/api/v1/auth/login", {
    data: { email: `${who}@shopsphere.dev`, password: PASSWORD },
  })
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { data: { accessToken: string } }).data
    .accessToken
}
