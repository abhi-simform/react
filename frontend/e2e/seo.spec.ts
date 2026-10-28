import { expect, test } from "./support/fixtures"

/**
 * 13.9: what a crawler can read. Two different questions:
 *  - the HTML a crawler downloads BEFORE running any JavaScript (`request.get`): only prerendered routes have
 *    their tags there;
 *  - the page after JavaScript ran (`page`): Googlebot renders it, most social-card crawlers do not.
 */
const SLUG = "the-ordinary-j63-night-cream-ski-00200"

test("the prerendered home page has its metadata in the raw HTML (no JavaScript needed)", async ({
  request,
}) => {
  const html = await (await request.get("/")).text()
  expect(html).toContain('<link rel="canonical" href="http://localhost:5173/"')
  expect(html).toContain('property="og:title"')
  expect(html).toContain('name="description"')
  expect(html).toContain('"@type":"WebSite"')
})

test("a product page is a different story: its tags exist only after JavaScript ran", async ({
  request,
  page,
}) => {
  const raw = await (await request.get(`/p/${SLUG}`)).text()
  expect(raw).not.toContain('"@type":"Product"') // the SPA shell: what a link-preview crawler sees
  await page.goto(`/p/${SLUG}`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `http://localhost:5173/p/${SLUG}`
  )
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "product"
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^https:\/\/picsum\.photos\//
  )
  const title = await page.title()
  expect(title).toMatch(/\| ShopSphere$/)
  expect(title).not.toBe("Product | ShopSphere")
})

test("product JSON-LD matches the product the page shows", async ({ page }) => {
  await page.goto(`/p/${SLUG}`)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) =>
      els.map(
        (e) => JSON.parse(e.textContent ?? "{}") as Record<string, unknown>
      )
    )
  const product = blocks.find((b) => b["@type"] === "Product") as {
    name: string
    sku: string
    offers: { price: number; priceCurrency: string; availability: string }
    aggregateRating?: { ratingValue: number; reviewCount: number }
  }
  const crumbs = blocks.find((b) => b["@type"] === "BreadcrumbList") as {
    itemListElement: unknown[]
  }
  expect(product.name).toBe(
    await page.getByRole("heading", { level: 1 }).innerText()
  )
  expect(product.offers.priceCurrency).toBe("INR")
  expect(product.offers.price).toBeGreaterThan(0)
  expect(product.offers.availability).toMatch(
    /schema.org\/(InStock|OutOfStock)/
  )
  expect(crumbs.itemListElement.length).toBeGreaterThanOrEqual(3)
})

test("canonical URLs carry no tracking parameters and no filters", async ({
  page,
}) => {
  await page.goto(
    "/products?utm_source=newsletter&gclid=abc&brand=Apple&sort=price_asc"
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:5173/products"
  )
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0) // listings are indexable
  // Internal search results are not.
  await page.goto("/products?search=shirt")
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow"
  )
})

test("private and transactional pages are noindex", async ({
  page,
  signedIn,
}) => {
  for (const path of ["/cart", "/login", "/register", "/forgot-password"]) {
    await page.goto(path)
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute(
      "content",
      "noindex, nofollow"
    )
  }
  await signedIn.goto("/account")
  await expect(signedIn.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow"
  )
  await signedIn.goto("/orders")
  await expect(signedIn.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow"
  )
})

test("robots.txt points at a sitemap that lists products", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text()
  expect(robots).toContain("Sitemap: http://localhost:5173/sitemap.xml")
  expect(robots).toContain("Disallow: /cart")
  const sitemap = await (await request.get("/sitemap.xml")).text()
  expect(sitemap).toContain("<urlset")
  expect(sitemap).toContain(`/p/${SLUG}`)
  expect((sitemap.match(/<url>/g) ?? []).length).toBeGreaterThan(300)
})
