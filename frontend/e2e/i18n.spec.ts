import { expect, test } from "./support/fixtures"

/**
 * 13.8: language, currency and direction. The prices the API charges are INR; the currency switch only
 * changes what is SHOWN. The RTL language is a pseudo-localisation (English wrapped in right-to-left
 * marks): it exists to prove the layout survives `dir="rtl"`.
 */
const languageSelect = (page: import("@playwright/test").Page) =>
  page.locator("header select").nth(0)
const currencySelect = (page: import("@playwright/test").Page) =>
  page.locator("header select").nth(1)

test("switching to Hindi translates the header without a reload and survives one", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("link", { name: "Products" }).first()
  ).toBeVisible()
  await languageSelect(page).selectOption("hi")
  await expect(page.getByRole("link", { name: "उत्पाद" }).first()).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "hi")
  // header cart button: plural aria-label in Hindi
  await expect(
    page.getByRole("button", { name: /कार्ट खोलें, 0 वस्तु/ })
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole("link", { name: "उत्पाद" }).first()).toBeVisible()
  await expect(languageSelect(page)).toHaveValue("hi")
})

test("the language chunk is only downloaded when it is chosen", async ({
  page,
}) => {
  const chunks: string[] = []
  page.on("request", (r) => {
    if (
      /\/assets\/(index|common|cart)-.*\.js/.test(r.url()) &&
      r.resourceType() === "script"
    )
      chunks.push(r.url())
  })
  const before: string[] = []
  page.on("response", (r) => {
    if (r.url().includes("/locales/hi") || r.url().includes("hi-"))
      before.push(r.url())
  })
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  const hindiBefore = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((n) => /\/assets\/.*\.js/.test(n)).length
  )
  await languageSelect(page).selectOption("hi")
  await expect(page.getByRole("link", { name: "उत्पाद" }).first()).toBeVisible()
  const after = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .filter((e) => /\/assets\/.*\.js/.test(e.name)).length
  )
  expect(after).toBeGreaterThan(hindiBefore) // new chunk(s) arrived on the switch
})

test("currency switch converts what is shown, never what is charged", async ({
  page,
}) => {
  await page.goto("/products")
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to cart" })
    .click()
  await expect(page.getByText("Added to cart").first()).toBeVisible()

  // The API's own cart (INR, whole rupees per unit) is the reference for what would be charged.
  const cartResponse = page.waitForResponse(
    (r) => /\/api\/v1\/cart$/.test(r.url()) && r.request().method() === "GET"
  )
  await page.goto("/cart")
  const cart = (await (await cartResponse).json()) as {
    data: {
      items: { unitPrice: number; qty: number; savedForLater?: boolean }[]
    }
  }
  const subtotalInr = cart.data.items
    .filter((i) => !i.savedForLater)
    .reduce((sum, i) => sum + i.unitPrice * i.qty, 0)

  const summary = page.getByRole("complementary", { name: "Order summary" })
  await expect(summary).toContainText(`₹${subtotalInr.toLocaleString("en-IN")}`)
  await expect(page.getByText(/You are charged in INR/)).toHaveCount(0) // INR: no note

  await currencySelect(page).selectOption("USD")
  await expect(
    page.getByText(/shown in USD for reference only. You are charged in INR/)
  ).toBeVisible()
  // The display rate comes from GET /config/public (USD 0.0119): the same subtotal, converted.
  const usd = (subtotalInr * 0.0119).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  await expect(summary).toContainText(`$${usd}`)
  await expect(summary).not.toContainText("₹")

  // ...and back to INR the note goes away and the rupee amount is the same number as before.
  await currencySelect(page).selectOption("INR")
  await expect(page.getByText(/You are charged in INR/)).toHaveCount(0)
  await expect(summary).toContainText(`₹${subtotalInr.toLocaleString("en-IN")}`)
})

test("right-to-left smoke test: header, cart and product page do not overflow or break", async ({
  page,
}) => {
  await page.goto("/products")
  await page
    .getByRole("article")
    .first()
    .getByRole("button", { name: "Add to cart" })
    .click()
  await expect(page.getByText("Added to cart").first()).toBeVisible()
  await languageSelect(page).selectOption("ar")
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl")

  const pages: [string, string][] = [
    ["header + listing", "/products"],
    ["cart", "/cart"],
    ["product page", "/p/the-ordinary-j63-night-cream-ski-00200"],
  ]
  for (const [name, path] of pages) {
    await page.goto(path)
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await page.getByRole("heading").first().waitFor()
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      // the primary nav is laid out from the right edge: its first link sits right of its last one
      navFirst:
        document.querySelector("header nav a")?.getBoundingClientRect().left ??
        0,
      navLast:
        [...document.querySelectorAll("header nav a")]
          .at(-1)
          ?.getBoundingClientRect().left ?? 0,
    }))
    expect(
      overflow.scroll,
      `${name}: no horizontal scrollbar`
    ).toBeLessThanOrEqual(overflow.client + 1)
    expect(overflow.navFirst, `${name}: nav order is mirrored`).toBeGreaterThan(
      overflow.navLast
    )
    await page.screenshot({
      path: `e2e/.results/rtl-${name.replace(/\W+/g, "-")}.png`,
    })
  }
})
