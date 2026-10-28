import { afterEach, describe, expect, it, vi } from "vitest"

import orderDetail from "@/test/fixtures/api/order-detail.json"
import { db } from "@/test/msw/db"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

/**
 * Found by the Playwright suite, which runs against a PRODUCTION build: `api()` validates (and so
 * runs a schema's `.transform`) only in development. The orders schema renames `id` -> `_id`, so in
 * production a placed order had no `_id` and the success redirect failed with
 * `Missing ":orderId" param`. Orders now opt in with `mapsData: true`.
 */
describe("production mode (DEV=false): schemas that MAP the response still run", () => {
  it("getOrder returns the mapped order (`_id`, not `id`)", async () => {
    vi.resetModules()
    vi.stubEnv("DEV", false)
    const { getOrder } = await import("@/features/orders/orders.api")
    const order = await getOrder(db.orders[0]!.id as string)
    expect(order._id).toBe(orderDetail.data.id)
    expect("id" in order).toBe(false)
  })

  it("lists are mapped too", async () => {
    vi.resetModules()
    vi.stubEnv("DEV", false)
    const { getOrders } = await import("@/features/orders/orders.api")
    const page = await getOrders({}, 1)
    expect(page.items.every((o) => typeof o._id === "string")).toBe(true)
  })
})
