import AxeBuilder from "@axe-core/playwright"

import { expect, test } from "./support/fixtures"

/**
 * 13.7: dark mode. (1) no flash of the wrong theme on a hard reload (the class is on <html> at the
 * first paint), proved with a control that removes the head script; (2) `system` follows the
 * OS live; (3) axe finds no contrast violations in the dark theme on the main pages.
 */
// (Init scripts are serialised: no closures, data goes through the argument.)
const storeTheme = ([key, value]: [string, string]) =>
  localStorage.setItem(key, value)
const DARK: [string, string] = ["shopsphere.theme", '"dark"']

// Record whether <html class="dark"> is already set when the browser FIRST PAINTS (`first-paint`, not
// `first-contentful-paint`: the flash is the blank white canvas BEFORE the app's JavaScript has run).
const recordFirstPaint = () => {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      if (e.name === "first-paint")
        (window as unknown as { __darkAtFcp: boolean }).__darkAtFcp =
          document.documentElement.classList.contains("dark")
  }).observe({ type: "paint", buffered: true })
}

async function darkAtFcp(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => "__darkAtFcp" in window)
  return page.evaluate(
    () => (window as unknown as { __darkAtFcp: boolean }).__darkAtFcp
  )
}

test.describe("no theme flash", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(storeTheme, DARK)
    await page.addInitScript(recordFirstPaint)
  })

  test("a stored dark choice is applied before the first paint", async ({
    page,
  }) => {
    await page.goto("/login")
    expect(await darkAtFcp(page)).toBe(true)
  })

  test("control: without the head script the first paint IS light (the flash this fix removes)", async ({
    page,
  }) => {
    await page.route("**/login", async (route) => {
      const res = await route.fetch()
      const html = (await res.text()).replace(
        /<script>\(function\(\)\{var t=null[^<]*<\/script>/,
        ""
      )
      await route.fulfill({ response: res, body: html })
    })
    await page.goto("/login")
    expect(await darkAtFcp(page)).toBe(false)
    // ...and the provider fixes it right after, which is exactly the visible flash.
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})

test("`system` follows the OS setting live, without a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/login")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).not.toHaveClass(/dark/)
})

test.describe("dark theme accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(storeTheme, DARK)
  })
  for (const [name, path] of [
    ["login", "/login"],
    ["home", "/"],
    ["listing", "/products"],
    ["cart", "/cart"],
  ] as const) {
    test(`no contrast violations on ${name}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator("html")).toHaveClass(/dark/)
      await page.getByRole("heading").first().waitFor()
      if (path === "/products")
        await expect(page.getByRole("article").first()).toBeVisible()
      await page.waitForFunction(() =>
        document
          .getAnimations()
          .every(
            (a) =>
              a.playState !== "running" ||
              a.effect?.getComputedTiming().iterations === Infinity
          )
      )
      const { violations } = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze()
      expect(
        violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`
        )
      ).toEqual([])
    })
  }
})
