import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { signIn } from "./support/auth"

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze()
  const bad = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  )
  expect(
    bad.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.html.slice(0, 120)}`
    )
  ).toEqual([])
}

test.describe("axe: zero serious/critical violations", () => {
  test("login", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    await scan(page)
  })
  test("dashboard", async ({ page }) => {
    await signIn(page, "admin", "/")
    await expect(
      page.getByRole("figure", { name: "Revenue by day" })
    ).toBeVisible()
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible()
    await scan(page)
  })
  test("orders list and an order", async ({ page }) => {
    await signIn(page, "admin", "/orders")
    await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible()
    await scan(page)
    await page.getByRole("link", { name: /^SS-/ }).first().click()
    await expect(
      page.getByRole("heading", { name: /^Order SS-/ })
    ).toBeVisible()
    await scan(page)
  })
  test("product form", async ({ page }) => {
    await signIn(page, "admin", "/products/new")
    await expect(
      page.getByRole("heading", { name: "New product" })
    ).toBeVisible()
    await scan(page)
  })
})
