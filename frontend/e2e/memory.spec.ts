import { expect, test } from "@playwright/test"

/**
 * 12.7 leak drill, automated: "heap snapshots before/after navigating 20 times". Chrome's
 * Performance domain counts live event listeners, DOM nodes and JS heap; after a forced GC a
 * LEAK shows as numbers that keep climbing with every visit (a listener that is never removed,
 * a timer that keeps a component alive). Client-side navigations between pages must plateau.
 */
test("navigating 20 times does not grow listeners or DOM nodes", async ({
  page,
}) => {
  const client = await page.context().newCDPSession(page)
  await client.send("Performance.enable")
  const measure = async () => {
    await client.send("HeapProfiler.collectGarbage")
    const { metrics } = await client.send("Performance.getMetrics")
    const get = (name: string) =>
      metrics.find((m) => m.name === name)?.value ?? 0
    return {
      listeners: get("JSEventListeners"),
      nodes: get("Nodes"),
      heapMB: get("JSHeapUsedSize") / 1e6,
    }
  }
  const visit = async (path: string, ready: () => Promise<void>) => {
    await page
      .getByRole("link", { name: path === "/cart" ? /cart/i : "Products" })
      .first()
      .click()
    await ready()
  }

  await page.goto("/products")
  await expect(page.getByRole("article").first()).toBeVisible()
  // warm up: lazy chunks and caches fill once
  for (let i = 0; i < 3; i++) {
    await page.goto("/products")
    await expect(page.getByRole("article").first()).toBeVisible()
  }
  const before = await measure()

  for (let i = 0; i < 20; i++) {
    await page.getByRole("button", { name: /open cart/i }).click()
    await page.keyboard.press("Escape")
    await visit("/products", async () => {
      await expect(page.getByRole("article").first()).toBeVisible()
    })
    await page.getByRole("link", { name: "Deals" }).click()
    await expect(page).toHaveURL(/\/deals/)
    await page.getByRole("link", { name: "Products" }).first().click()
    await expect(page.getByRole("article").first()).toBeVisible()
  }
  const after = await measure()
  console.log("memory drill", { before, after })

  // generous bounds: a per-visit leak (20 visits) would blow through them
  expect(after.listeners - before.listeners).toBeLessThan(150)
  expect(after.nodes - before.nodes).toBeLessThan(2000)
})
