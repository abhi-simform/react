import { expect, type Page } from "@playwright/test"

/** Helpers for the shop flows that several specs repeat. */
export class ShopPage {
  constructor(private readonly page: Page) {}

  /** Empty the signed-in customer's (seeded) cart so a test starts from a known state. */
  async clearCart() {
    await this.page.goto("/cart")
    const clear = this.page.getByRole("button", { name: "Clear cart" })
    await expect(
      clear.or(this.page.getByText("Your cart is empty"))
    ).toBeVisible()
    if (await clear.isVisible()) await clear.click()
    await expect(this.page.getByText("Your cart is empty")).toBeVisible()
  }

  /** Add the cheapest in-stock product to the cart from the listing; returns its name. */
  async addCheapestProduct(): Promise<string> {
    await this.page.goto("/products?sort=price_asc&inStock=true")
    const card = this.page.getByRole("article").first()
    await expect(card).toBeVisible()
    const name = await card.getByRole("heading").innerText()
    await card.getByRole("button", { name: "Add to cart" }).click()
    await expect(
      this.page.getByRole("button", { name: /open cart, 1 item/i })
    ).toBeVisible()
    return name
  }

  /** Walk address -> delivery -> payment -> review with the first address and `payment`. */
  async fillCheckout(payment: "cod" | "razorpay") {
    const page = this.page
    await page.goto("/checkout")
    await expect(
      page.getByRole("heading", { name: "Delivery address" })
    ).toBeVisible()
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: /continue to delivery/i }).click()

    await expect(
      page.getByRole("heading", { name: "Delivery options" })
    ).toBeVisible()
    await page.getByRole("radio", { name: /^Standard/ }).check()
    await page
      .getByRole("radio", { name: /^[A-Z][a-z]+day, / })
      .first()
      .check()
    await page.getByRole("button", { name: /continue to payment/i }).click()

    await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible()
    await page
      .getByRole("radio", {
        name: payment === "cod" ? "Cash on delivery" : /^Pay online/,
      })
      .check()
    await page.getByRole("button", { name: /continue to review/i }).click()
    await expect(
      page.getByRole("heading", { name: "Review order" })
    ).toBeVisible()
  }
}
