import AxeBuilder from "@axe-core/playwright"

import { expect, test } from "./support/fixtures"
import { ShopPage } from "./pages/ShopPage"

/**
 * 12.9: axe on the audited pages, WCAG 2.2 A/AA rules. The gate is zero serious or critical
 * violations; anything else is printed so it is visible in the report. Automated rules catch about
 * a third of the problems: keyboard flows, focus handling, reflow and reduced motion are checked
 * by the other tests in this file and by hand (docs/a11y-audit.md).
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function scan(page: import("@playwright/test").Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const blocking = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical"
  )
  for (const v of violations)
    console.log(
      `axe [${name}] ${v.impact} ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target.join(" ")}`
    )
  expect(
    blocking.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`
    ),
    `serious/critical axe violations on ${name}`
  ).toEqual([])
}

test.describe("axe: public pages", () => {
  for (const [name, path, ready] of [
    ["home", "/", "heading"],
    ["listing", "/products?sort=price_asc", "article"],
    ["login", "/login", "heading"],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto(path)
      await (ready === "article"
        ? expect(page.getByRole("article").first()).toBeVisible()
        : expect(page.getByRole("heading").first()).toBeVisible())
      await scan(page, name)
    })
  }

  test("product page", async ({ page }) => {
    await page.goto("/products?inStock=true")
    await page.getByRole("article").first().getByRole("link").first().click()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await scan(page, "pdp")
  })

  test("cart (guest, with a line)", async ({ page }) => {
    await page.goto("/products?sort=price_asc&inStock=true")
    await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "Add to cart" })
      .click()
    await expect(
      page.getByRole("button", { name: /open cart, 1 item/i })
    ).toBeVisible()
    await page.goto("/cart")
    await expect(
      page.getByRole("heading", { name: /your cart/i })
    ).toBeVisible()
    await scan(page, "cart")
  })
})

test.describe("axe: signed-in pages", () => {
  test("every checkout step, the account page", async ({ signedIn: page }) => {
    const shop = new ShopPage(page)
    await shop.clearCart()
    await shop.addCheapestProduct()
    await page.goto("/checkout")
    await expect(
      page.getByRole("heading", { name: "Delivery address" })
    ).toBeVisible()
    await scan(page, "checkout/address")
    await page.getByRole("radio").first().check()
    await page.getByRole("button", { name: /continue to delivery/i }).click()
    await expect(
      page.getByRole("heading", { name: "Delivery options" })
    ).toBeVisible()
    await scan(page, "checkout/delivery")
    await page.getByRole("radio", { name: /^Standard/ }).check()
    await page
      .getByRole("radio", { name: /^[A-Z][a-z]+day, / })
      .first()
      .check()
    await page.getByRole("button", { name: /continue to payment/i }).click()
    await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible()
    await scan(page, "checkout/payment")
    await page.getByRole("radio", { name: "Cash on delivery" }).check()
    await page.getByRole("button", { name: /continue to review/i }).click()
    await expect(
      page.getByRole("heading", { name: "Review order" })
    ).toBeVisible()
    await scan(page, "checkout/review")

    await page.goto("/account")
    await expect(page.getByRole("heading").first()).toBeVisible()
    await scan(page, "account")
  })
})

test.describe("keyboard, focus, reflow, motion", () => {
  test("keyboard only: skip link, search, add to cart, drawer trap and focus restore", async ({
    page,
  }) => {
    await page.goto("/products?sort=price_asc&inStock=true")
    await expect(page.getByRole("article").first()).toBeVisible()
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("link", { name: "Skip to content" })
    ).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.locator("#main")).toBeFocused()

    const cartButton = page.getByRole("button", { name: /open cart/i })
    await cartButton.focus()
    await page.keyboard.press("Enter")
    const drawer = page.getByRole("dialog", { name: "Your cart" })
    await expect(drawer).toBeVisible()
    // focus is inside the dialog and stays there while tabbing
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab")
      await expect(drawer.locator(":focus")).toHaveCount(1)
    }
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(cartButton).toBeFocused() // focus restored to the opener
  })

  test("every tab stop shows a visible focus indicator", async ({ page }) => {
    for (const path of ["/login", "/products?inStock=true"]) {
      await page.goto(path)
      await expect(page.getByRole("heading").first()).toBeVisible()
      const missing: string[] = []
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press("Tab")
        const stop = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null
          if (!el || el === document.body) return null
          const s = getComputedStyle(el)
          const outline =
            s.outlineStyle !== "none" &&
            parseFloat(s.outlineWidth) > 0 &&
            s.outlineColor !== "rgba(0, 0, 0, 0)"
          const shadow = s.boxShadow !== "none"
          const underline = s.textDecorationLine.includes("underline")
          return {
            name: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`,
            visible: outline || shadow || underline,
          }
        })
        // the Query devtools toggle exists only under `vite dev`: not part of the product
        if (stop && !stop.visible && !/devtools/i.test(stop.name))
          missing.push(stop.name)
      }
      expect(
        missing,
        `tab stops without a visible focus style on ${path}`
      ).toEqual([])
    }
  })

  for (const width of [320, 360]) {
    test(`reflow at ${width}px: no horizontal scroll on the main pages`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 700 })
      for (const path of ["/", "/products", "/cart", "/login"]) {
        await page.goto(path)
        await expect(page.getByRole("heading").first()).toBeVisible()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        )
        expect(
          overflow,
          `horizontal overflow on ${path} at ${width}px`
        ).toBeLessThanOrEqual(0)
      }
    })
  }

  test("200% zoom (a 640px-wide layout) keeps every page usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 640, height: 400 })
    for (const path of ["/products", "/login"]) {
      await page.goto(path)
      await expect(page.getByRole("heading").first()).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        )
      ).toBeLessThanOrEqual(0)
    }
  })

  test("prefers-reduced-motion: the hero carousel does not autoplay", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    await expect(page.getByRole("heading").first()).toBeVisible()
    const active = () =>
      page.locator('[aria-current="true"]').first().getAttribute("aria-label")
    const before = await active()
    await page.waitForTimeout(7000) // longer than the 6 s autoplay interval: asserting that NOTHING happens needs the time
    expect(await active()).toBe(before)
  })
})
