import { expect, test } from "./support/fixtures"

/**
 * 13.11: network hygiene. HTTP caching (Cache-Control + ETag -> 304), no duplicate requests while a page
 * loads, no avoidable waterfall for the bell's unread count, and a preconnect to the API origin.
 */
const API = "http://localhost:4000/api/v1"

test("the API tells caches what they may keep: public catalog vs private data", async ({
  request,
  signedIn,
}) => {
  void signedIn
  const cc = async (path: string, headers: Record<string, string> = {}) =>
    (await request.get(`${API}${path}`, { headers })).headers()["cache-control"]
  expect(await cc("/categories")).toBe(
    "public, max-age=300, stale-while-revalidate=3600"
  )
  expect(await cc("/products?limit=12")).toBe(
    "public, max-age=10, stale-while-revalidate=60"
  )
  expect(await cc("/config/public")).toContain("max-age=3600")
  expect(await cc("/time")).toBe("no-store")
  const login = await request.post(`${API}/auth/login`, {
    data: { email: "customer@shopsphere.dev", password: "Password123" },
    headers: { "x-forwarded-for": "10.77.0.1" },
  })
  const token = (await login.json()).data.accessToken as string
  expect(await cc("/cart", { Authorization: `Bearer ${token}` })).toBe(
    "private, no-cache"
  )
  expect(await cc("/users/me", { Authorization: `Bearer ${token}` })).toBe(
    "private, no-cache"
  )
})

test("revalidation returns 304 with no body for every public catalog endpoint, and 200 again after a change", async ({
  request,
}) => {
  const endpoints = [
    "/categories",
    "/brands",
    "/products?limit=12&sort=relevance",
    "/products/the-ordinary-j63-night-cream-ski-00200",
    "/banners?placement=hero",
    "/config/public",
  ]
  let revalidated = 0
  for (const ep of endpoints) {
    const first = await request.get(`${API}${ep}`)
    const etag = first.headers()["etag"]
    expect(etag, `${ep} has an ETag`).toBeTruthy()
    const second = await request.get(`${API}${ep}`, {
      headers: { "If-None-Match": etag! },
    })
    expect(second.status(), ep).toBe(304)
    expect((await second.body()).length).toBe(0)
    revalidated++
  }
  expect(revalidated).toBeGreaterThanOrEqual(3)

  // ...and the validator is honest: change the product and the same If-None-Match no longer matches.
  const slug = "the-ordinary-j63-night-cream-ski-00200"
  const detail = await request.get(`${API}/products/${slug}`)
  const etag = detail.headers()["etag"]!
  const product = (await detail.json()).data as { _id: string; price: number }
  const login = await request.post(`${API}/auth/login`, {
    data: { email: "admin@shopsphere.dev", password: "Password123" },
    headers: { "x-forwarded-for": "10.77.0.2" },
  })
  const token = (await login.json()).data.accessToken as string
  const setPrice = (price: number) =>
    request.patch(`${API}/admin/products/${product._id}/price`, {
      data: { price },
      headers: { Authorization: `Bearer ${token}` },
    })
  expect((await setPrice(product.price - 1)).ok()).toBe(true)
  const after = await request.get(`${API}/products/${slug}`, {
    headers: { "If-None-Match": etag },
  })
  expect(after.status()).toBe(200)
  expect((await after.json()).data.price).toBe(product.price - 1)
  await setPrice(product.price) // put it back
})

test("the first seconds of the home page make no duplicate identical requests", async ({
  page,
  signedIn,
}) => {
  const seen = new Map<string, number>()
  signedIn.on("request", (r) => {
    if (r.url().startsWith(API) && r.method() === "GET")
      seen.set(r.url(), (seen.get(r.url()) ?? 0) + 1)
  })
  await signedIn.goto("/")
  await signedIn.waitForTimeout(5000)
  expect(seen.size).toBeGreaterThan(5)
  expect([...seen].filter(([, n]) => n > 1)).toEqual([])
  void page
})

test("the bell's unread count is requested right after sign-in, not after the bell's chunk", async ({
  signedIn,
}) => {
  const t: Record<string, number> = {}
  signedIn.on("response", (r) => {
    if (r.url().endsWith("/auth/refresh")) t.refreshDone = Date.now()
  })
  signedIn.on("request", (r) => {
    if (r.url().endsWith("/notifications/unread-count")) t.unread = Date.now()
  })
  await signedIn.goto("/")
  await expect.poll(() => t.unread).toBeTruthy()
  // before 13.11 this was ~300 ms (chunk download + render first); now it follows the token immediately
  expect(t.unread! - t.refreshDone!).toBeLessThan(250)
})

test("the page connects early to the API origin", async ({ page }) => {
  await page.goto("/")
  const link = page.locator(
    'link[rel="preconnect"][href="http://localhost:4000"]'
  )
  await expect(link).toHaveCount(1)
  await expect(link).toHaveAttribute("crossorigin", "use-credentials")
})
