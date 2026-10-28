import { expect, test } from "@playwright/test"

test.describe("guest browsing", () => {
  test("search, filter by brand and sort", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("combobox", { name: /search/i }).fill("headphones")
    await page.getByRole("combobox", { name: /search/i }).press("Enter")
    await expect(page).toHaveURL(/\/products\?search=headphones/)
    await expect(
      page.getByRole("heading", { name: 'Results for "headphones"' })
    ).toBeVisible()
    const cards = page.getByRole("article")
    await expect(cards.first()).toBeVisible()

    // tick the first brand the sidebar offers
    const brandBox = page
      .getByRole("group", { name: "Brand" })
      .getByRole("checkbox")
      .first()
    await brandBox.click() // controlled by the URL: `check()` would verify the state too early
    await expect(page).toHaveURL(/brand=/)
    await expect(
      page.getByRole("list", { name: "Active filters" })
    ).toBeVisible()

    await page.getByLabel("Sort by").selectOption("price_asc")
    await expect(page).toHaveURL(/sort=price_asc/)
    const prices = await page
      .getByRole("article")
      .evaluateAll((els) =>
        els.map((el) =>
          Number(el.textContent?.match(/₹([\d,]+)/)?.[1]?.replace(/,/g, ""))
        )
      )
    expect(prices.length).toBeGreaterThan(0)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  test("open a product from the listing", async ({ page }) => {
    await page.goto("/products")
    const first = page.getByRole("article").first()
    const name = await first.getByRole("heading").innerText()
    await first.getByRole("link").first().click()
    await expect(page).toHaveURL(/\/p\//)
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
  })

  test("a failing products API shows the error state, and Retry recovers", async ({
    page,
  }) => {
    let fail = true
    await page.route("**/api/v1/products?**", (route) =>
      fail
        ? route.fulfill({
            status: 500,
            json: {
              success: false,
              error: { code: "INTERNAL", message: "Boom" },
            },
          })
        : route.continue()
    )
    await page.goto("/products")
    const alert = page
      .getByRole("alert")
      .filter({ hasText: "Something went wrong on our side" })
    await expect(alert).toBeVisible()
    fail = false
    await alert.getByRole("button", { name: "Retry" }).click()
    await expect(page.getByRole("article").first()).toBeVisible()
    await expect(alert).toBeHidden()
  })
})
