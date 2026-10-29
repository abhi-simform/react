import { expect, test } from "./support/fixtures"

/**
 * 14.1 / 14.6: properties of the PRODUCTION build served by `npm start` (the static SPA server): the headers a
 * host must send, the SPA fallback, and that error tracking is fully off when the build has no DSN.
 */
test("deep links answer 200 with the SPA shell, a missing asset answers 404", async ({
  request,
}) => {
  for (const path of [
    "/p/anything-at-all",
    "/cart",
    "/orders",
    "/checkout/review",
  ]) {
    const res = await request.get(path)
    expect(res.status(), path).toBe(200)
    expect(await res.text(), path).toContain("<title>")
  }
  expect((await request.get("/assets/does-not-exist.js")).status()).toBe(404)
})

test("caching and security headers: immutable hashed assets, a revalidated shell, a CSP that names the API", async ({
  request,
  page,
}) => {
  const shell = await request.get("/cart")
  expect(shell.headers()["cache-control"]).toBe("no-cache")
  expect(shell.headers()["x-content-type-options"]).toBe("nosniff")
  const csp = shell.headers()["content-security-policy"]
  expect(csp).toContain("script-src 'self' 'sha256-")
  expect(csp).toContain(
    "connect-src 'self' http://localhost:4000 ws://localhost:4000"
  )
  expect(csp).not.toContain("__") // every build-time placeholder was filled
  expect(csp).not.toContain("unsafe-eval")

  const asset = await page.goto("/").then(() =>
    page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .map((r) => r.name)
          .find((n) => /\/assets\/.+\.js$/.test(n)) ?? ""
    )
  )
  const res = await request.get(asset)
  expect(res.headers()["cache-control"]).toContain("immutable")
  expect(res.headers()["cache-control"]).toContain("max-age=31536000")
})

test("the page runs under the enforced CSP: no violation, no console error", async ({
  page,
}) => {
  const problems: string[] = []
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text())
  })
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`)
    })
  })
  for (const path of ["/", "/products", "/cart", "/login"]) {
    await page.goto(path)
    await expect(page.getByRole("heading").first()).toBeVisible()
  }
  expect(problems.filter((p) => /CSP|Content Security/i.test(p))).toEqual([])
})

test("without a Sentry DSN nothing is loaded or sent, and the lab page says so", async ({
  page,
}) => {
  const requested: string[] = []
  page.on("request", (r) => requested.push(r.url()))
  await page.goto("/debug/sentry")
  await expect(page.getByText(/not enabled in this build/i)).toBeVisible()
  // the SDK chunk (`assets/sentry-<hash>.js`) and any request to a Sentry host
  expect(
    requested.filter((u) => /\/assets\/sentry-|sentry\.io|:9999/i.test(u))
  ).toEqual([])
})

test("no source map is served publicly", async ({ request, page }) => {
  await page.goto("/")
  const asset = await page.evaluate(
    () =>
      performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find((n) => /\/assets\/.+\.js$/.test(n)) ?? ""
  )
  expect(asset).not.toBe("")
  expect((await request.get(`${asset}.map`)).status()).toBe(404)
  expect(await (await request.get(asset)).text()).not.toContain(
    "sourceMappingURL"
  )
})

test("legal pages: the prerendered HTML carries the metadata, the page shows the real text, an unknown policy is branded", async ({
  request,
  page,
}) => {
  // Prerendering in SPA mode writes the <head> (title, description, canonical); the body is the SPA shell until
  // JavaScript runs (13.9: only SSR would put the text in the HTML).
  for (const [slug, title] of [
    ["privacy", "Privacy policy"],
    ["returns", "Returns and refunds"],
    ["terms", "Terms of use"],
  ]) {
    const html = await (await request.get(`/policies/${slug}`)).text()
    expect(html, slug).toContain(`<title>${title} | ShopSphere</title>`)
    await page.goto(`/policies/${slug}`)
    await expect(
      page.getByRole("heading", { level: 1, name: title })
    ).toBeVisible()
    await expect(page.getByText(/last updated/i)).toBeVisible()
  }
  await page.goto("/policies/shipping")
  await expect(
    page.getByRole("heading", { name: /not found/i }).first()
  ).toBeVisible()
})
