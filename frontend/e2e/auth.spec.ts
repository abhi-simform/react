import { expect, test } from "@playwright/test"

import { LoginPage } from "./pages/LoginPage"
import { CUSTOMER } from "./support/fixtures"
import { linkIn, waitForMail } from "./support/mailpit"

test.describe("accounts", () => {
  test("register, verify through the mailed link, then log in", async ({
    page,
    request,
  }) => {
    const email = `e2e-${Date.now()}@example.com`
    const password = "Passw0rdE2E"

    await page.goto("/register")
    await page.getByLabel("Full name").fill("Eve Tester")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password", { exact: true }).fill(password)
    await page.getByLabel("Confirm password").fill(password)
    await page.getByLabel("I accept the terms").check()
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(
      page.getByRole("heading", { name: "Check your email" })
    ).toBeVisible()

    // the verification link comes from Mailpit's API, not from the UI
    const mail = await waitForMail(request, email, { subject: /verify/i })
    const link = linkIn(mail, "/verify-email?token=")
    await page.goto(link)
    await expect(page.getByText(/verified/i).first()).toBeVisible()

    // sign out and in again through the UI (the one place the login form is exercised)
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn(email, password)
    await expect(page).toHaveURL("/")
    await expect(
      page
        .getByRole("button", { name: /account menu|eve tester/i })
        .or(page.getByText("Eve Tester"))
        .first()
    ).toBeVisible()
  })

  test("a wrong password shows one generic message", async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.signIn(CUSTOMER.email, "WrongPass1")
    await expect(page.getByText("Incorrect email or password.")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("a guest who opens /checkout logs in and is taken on from there", async ({
    page,
  }) => {
    await page.goto("/checkout")
    await expect(page).toHaveURL(/\/login\?from=%2Fcheckout/)
    const login = new LoginPage(page)
    await login.signIn(CUSTOMER.email, CUSTOMER.password)
    // the login honoured `from`; the seeded cart has a changed price, so checkout itself
    // sends the shopper to the cart to review it (that guard is covered by its own spec)
    await expect(page).toHaveURL(/\/(checkout\/address|cart)$/)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
