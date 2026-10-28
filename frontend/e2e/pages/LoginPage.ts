import type { Page } from "@playwright/test"

/** Page object for the login form: every spec that signs in through the UI uses it. */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(from?: string) {
    await this.page.goto(
      from ? `/login?from=${encodeURIComponent(from)}` : "/login"
    )
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email)
    await this.page.getByLabel("Password").fill(password)
    await this.page.getByRole("button", { name: "Log in" }).click()
  }
}
