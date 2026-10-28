import { expect, test } from "./support/fixtures"
import { ShopPage } from "./pages/ShopPage"

test.describe("the revenue path", () => {
  test("cart -> checkout with cash on delivery -> the order is in /orders", async ({
    signedIn: page,
  }) => {
    const shop = new ShopPage(page)
    await shop.clearCart()
    const product = await shop.addCheapestProduct()

    await shop.fillCheckout("cod")
    await expect(page.getByText(product).first()).toBeVisible()
    await page.getByRole("button", { name: "Place order" }).click()

    await expect(page.getByTestId("order-success")).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\/success\//)
    const orderNumber = await page
      .getByText(/SS-[A-Z0-9-]+/)
      .first()
      .innerText()

    await page.goto("/orders")
    await expect(
      page.getByRole("heading", { name: "Your orders" })
    ).toBeVisible()
    await expect(
      page.getByText(orderNumber.match(/SS-[A-Z0-9-]+/)![0]).first()
    ).toBeVisible()
  })

  test("an empty cart sends /checkout back to the cart", async ({
    signedIn: page,
  }) => {
    const shop = new ShopPage(page)
    await shop.clearCart()
    await page.goto("/checkout/address")
    await expect(page).toHaveURL(/\/cart/)
  })
})
