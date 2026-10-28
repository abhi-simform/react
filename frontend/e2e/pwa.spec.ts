import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { test as plain } from "@playwright/test"

import { expect, test } from "./support/fixtures"

/**
 * 13.10: the service worker, the manifest and offline behaviour, against the PRODUCTION build (the only place a
 * service worker exists). Service workers are allowed here and blocked in every other spec (see the config).
 */
test.use({ serviceWorkers: "allow" })
// The offline and update tests use Playwright's plain `test`: the suite's `clientIp` fixture installs
// `context.route`, and with request interception enabled Chromium does not let a service worker answer a
// navigation while the context is offline (a harness effect, not the app's: it works without the route).
// The few API calls these tests make stay far below the rate limit.
plain.use({ serviceWorkers: "allow" })

const SLUG = "the-ordinary-j63-night-cream-ski-00200"

async function controlled(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path)
  await page.evaluate(() => navigator.serviceWorker.ready)
  // The first load is not controlled (the worker claims clients when it activates); reload so it is.
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true)
}

test("the app is installable: a valid manifest and no installability errors", async ({
  page,
}) => {
  await page.goto("/")
  const cdp = await page.context().newCDPSession(page)
  const errors = await cdp.send("Page.getInstallabilityErrors")
  expect(errors.installabilityErrors).toEqual([])
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json()
  expect(manifest).toMatchObject({
    name: "ShopSphere",
    display: "standalone",
    start_url: expect.any(String),
  })
  const purposes = manifest.icons.map(
    (i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`
  )
  expect(purposes).toEqual(
    expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"])
  )
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest"
  )
  await expect(
    page.locator('meta[name="theme-color"]').first()
  ).toHaveAttribute("content", /#/)
})

test("the service worker precaches the shell and takes control", async ({
  page,
}) => {
  await controlled(page)
  const names = await page.evaluate(() => caches.keys())
  expect(names.some((n) => n.startsWith("shell-"))).toBe(true)
  const shell = await page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith("shell-"))!
    return (await (await caches.open(name)).keys()).map(
      (r) => new URL(r.url).pathname
    )
  })
  expect(shell).toEqual(
    expect.arrayContaining([
      "/",
      "/__spa-fallback.html",
      "/manifest.webmanifest",
    ])
  )
  expect(shell.some((p) => p.startsWith("/assets/") && p.endsWith(".js"))).toBe(
    true
  )
})

plain(
  "offline: pages already visited still work, the rest says so instead of breaking silently",
  async ({ page, context }) => {
    await controlled(page, "/products")
    await expect(page.getByRole("article").first()).toBeVisible()
    await page.goto(`/p/${SLUG}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.goto("/products")
    await expect(page.getByRole("article").first()).toBeVisible()

    await context.setOffline(true)
    // A page we visited: served by the service worker (shell) + the cached public catalog data.
    await page.reload()
    await expect(page.getByRole("article").first()).toBeVisible()
    await expect(page.getByText(/You are offline/).first()).toBeVisible()
    // The product page we opened works too.
    await page.goto(`/p/${SLUG}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    // The cart and checkout need the network: a clear explanation and no way to press the button.
    await page.goto("/cart")
    await expect(
      page.getByRole("alert").filter({ hasText: "You are offline" })
    ).toBeVisible()
    // A product we never opened cannot be loaded: an explained error, not a blank page.
    await page.goto("/p/never-visited-slug-123")
    await expect(
      page
        .getByRole("alert")
        .or(page.getByText(/offline|could not|network/i))
        .first()
    ).toBeVisible()

    // The offline page lists what the cache holds.
    await page.goto("/offline")
    await expect(
      page.getByRole("heading", { name: "You are offline" })
    ).toBeVisible()
    await expect(page.getByRole("link", { name: /Ordinary J63/ })).toBeVisible()

    await context.setOffline(false)
  }
)

test("the service worker never caches authenticated or private responses", async ({
  page,
  signedIn,
}) => {
  void page
  await signedIn.goto("/")
  await signedIn.evaluate(() => navigator.serviceWorker.ready)
  await signedIn.reload()
  await expect
    .poll(() =>
      signedIn.evaluate(() => Boolean(navigator.serviceWorker.controller))
    )
    .toBe(true)
  for (const path of [
    "/products",
    "/cart",
    "/orders",
    "/account",
    "/account/notifications",
    `/p/${SLUG}`,
  ]) {
    await signedIn.goto(path)
    await signedIn.waitForLoadState("networkidle")
  }
  const cached = await signedIn.evaluate(async () => {
    const urls: string[] = []
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys())
        urls.push(`${name} ${req.url}`)
    return urls
  })
  const apiEntries = cached.filter((u) => u.includes("/api/v1/"))
  expect(apiEntries.length).toBeGreaterThan(0) // public catalog data IS cached...
  for (const u of apiEntries)
    expect(u.startsWith("api-public-v1 "), u).toBe(true)
  // ...but nothing that belongs to a user.
  for (const u of cached)
    expect(u, "private endpoint in Cache Storage").not.toMatch(
      /\/api\/v1\/(cart|orders|auth|users|notifications|payments|me|wishlist|addresses|coupons\/available|recommendations)/
    )
})

plain(
  "a new deployment is picked up: an update prompt, then Reload activates it",
  async ({ page }) => {
    await controlled(page)
    const before = await page.evaluate(() => performance.timeOrigin)
    // `page.route` cannot intercept the browser's own check for a new worker script, so the "deployment" is
    // real: the served file gets different bytes (restored afterwards).
    const file = path.resolve("build/client/sw.js")
    const original = readFileSync(file, "utf8")
    try {
      writeFileSync(file, `${original}\n// a new build\n`)
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration?.update()
      })
      await expect(
        page.getByText("A new version of ShopSphere is available")
      ).toBeVisible()
      await page.getByRole("button", { name: "Reload" }).click()
      // The waiting worker takes over and the page reloads itself.
      await expect
        .poll(() => page.evaluate(() => performance.timeOrigin))
        .not.toBe(before)
      await expect(
        page.getByText("A new version of ShopSphere is available")
      ).toHaveCount(0)
    } finally {
      writeFileSync(file, original)
    }
  }
)

test("the install button appears when the browser offers an install prompt", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(0)
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    ;(window as unknown as { __prompted: boolean }).__prompted = false
    e.prompt = async () => {
      ;(window as unknown as { __prompted: boolean }).__prompted = true
    }
    e.userChoice = Promise.resolve({ outcome: "accepted" })
    window.dispatchEvent(e)
  })
  await page.getByRole("button", { name: "Install app" }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __prompted: boolean }).__prompted
      )
    )
    .toBe(true)
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(0)
})
