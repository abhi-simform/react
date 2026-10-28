import { expect, test } from "./support/fixtures"

test.describe("phone layout", () => {
  test("the cart drawer opens, shows a line and closes with Escape", async ({
    page,
  }) => {
    await page.goto("/products?sort=price_asc&inStock=true")
    const card = page.getByRole("article").first()
    const name = await card.getByRole("heading").innerText()
    await card.getByRole("button", { name: "Add to cart" }).click()

    await page.getByRole("button", { name: /open cart/i }).click()
    const drawer = page.getByRole("dialog", { name: "Your cart" })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole("link", { name })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    // no horizontal scroll at phone width
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test("the product page has a sticky buy bar that adds to the cart", async ({
    page,
  }) => {
    await page.goto("/products?inStock=true")
    await page.getByRole("article").first().getByRole("link").first().click()
    await expect(page).toHaveURL(/\/p\//)
    // the PDP offers demo variants: the buy bar stays disabled until every option is chosen
    await page.locator("label", { hasText: /^Black$/ }).click() // the visible swatch is the label
    await page.locator("label", { hasText: /^128 GB$/ }).click()
    const bar = page.getByRole("button", { name: "Add to cart" }).last()
    await expect(bar).toBeVisible()
    await bar.click()
    await expect(
      page.getByRole("button", { name: /open cart, 1 item/i })
    ).toBeVisible()
  })
})
