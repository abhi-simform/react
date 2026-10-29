import { expect, test } from "@playwright/test"

import { expectSignedInShell, signIn } from "./support/auth"

// The plan's flagship flow: log in as admin, create a product in the admin, see it on the storefront.
test("admin creates a product and it appears on the storefront", async ({
  page,
  browser,
}) => {
  const stamp = Date.now()
  const name = `E2E Widget ${stamp}`
  const slugStart = `e2e-widget-${stamp}`

  await signIn(page, "admin", "/products/new")
  await expectSignedInShell(page)
  await expect(page.getByRole("heading", { name: "New product" })).toBeVisible()

  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByLabel("Brand").fill("Acme E2E")
  await page.getByLabel("Category").selectOption({ index: 1 })
  await page.getByLabel("Status").selectOption("active")
  await page.getByRole("tab", { name: /Pricing/ }).click()
  await page.getByLabel("Selling price (₹)").fill("1499")
  await page.getByLabel("MRP (₹)").fill("1999")
  await page.getByLabel("SKU", { exact: true }).fill(`E2E-${stamp}`)
  await page.getByLabel(/^Stock/).fill("7")
  await page.getByRole("button", { name: "Create product" }).click()

  // Saved: the form navigates to the edit page of the new product.
  await expect(page).toHaveURL(/\/products\/[0-9a-f]{24}$/)
  await expect(page.getByText("Product created")).toBeVisible()

  // The storefront, in a SEPARATE browser context: the apps share the refresh cookie on localhost.
  const shop = await browser.newContext({ baseURL: "http://localhost:5173" })
  const storefront = await shop.newPage()
  await storefront.goto(`/p/${slugStart}`)
  await expect(
    storefront.getByRole("heading", { level: 1, name: name })
  ).toBeVisible()
  await expect(storefront.getByText("₹1,499").first()).toBeVisible()
  await shop.close()
})
