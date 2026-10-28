import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { drainJobs, enqueue, registerJob } from "../src/jobs/queue.js"
import { RedisRateLimitStore } from "../src/middleware/rateLimitStore.js"
import { Address } from "../src/modules/addresses/address.model.js"
import { AuditLog } from "../src/modules/audit/audit.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Notification } from "../src/modules/notifications/notification.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { expireUnpaidOrders } from "../src/modules/orders/order.expiry.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"
import { WishlistItem } from "../src/modules/wishlist/wishlist.model.js"
import { cached, clearMemoryCache, invalidate, stats } from "../src/utils/cache.js"
import "../src/jobs/index.js" // registers the job handlers (server.ts does this in production)

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

let seq = 0
async function account(role?: "admin") {
  const email = `b12-${seq++}@example.com`
  await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "B12 User", email, password: "Passw0rdOK" })
  if (role) await User.updateOne({ email }, { role })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email, password: "Passw0rdOK" })
  return {
    token: res.body.data.accessToken as string,
    id: res.body.data.user.id as string,
  }
}

let productId = ""
beforeEach(async () => {
  clearMemoryCache()
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const p = await Product.create({
    name: "Phone",
    slug: "phone",
    sku: "PH1",
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price: 1000,
    mrp: 2000,
    stock: 10,
  })
  productId = String(p._id)
})

describe("security headers", () => {
  it("API responses carry a locked-down CSP, nosniff and a Permissions-Policy", async () => {
    const res = await request(app).get(`${A}/health`)
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'")
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'")
    expect(res.headers["x-content-type-options"]).toBe("nosniff")
    expect(res.headers["referrer-policy"]).toBe("no-referrer")
    expect(res.headers["permissions-policy"]).toContain("camera=()")
    expect(res.headers["x-powered-by"]).toBeUndefined()
  })

  it("keeps Swagger UI usable: the docs page does not get default-src 'none'", async () => {
    const res = await request(app).get("/api/docs/")
    expect(res.status).toBe(200)
    expect(res.headers["content-security-policy"] ?? "").not.toContain(
      "default-src 'none'"
    )
  })
})

describe("HTTP caching", () => {
  it("public catalog GETs are cacheable and revalidate with ETag -> 304", async () => {
    const a = await request(app).get(`${A}/categories`)
    expect(a.headers["cache-control"]).toBe(
      "public, max-age=300, stale-while-revalidate=3600"
    )
    const etag = a.headers.etag as string
    expect(etag).toBeTruthy()
    const b = await request(app).get(`${A}/categories`).set("If-None-Match", etag)
    expect(b.status).toBe(304)
    expect(b.text).toBe("")
    // A product list: same story.
    const list = await request(app).get(`${A}/products`)
    expect(list.headers["cache-control"]).toContain("public, max-age=10")
    const again = await request(app)
      .get(`${A}/products`)
      .set("If-None-Match", list.headers.etag as string)
    expect(again.status).toBe(304)
  })

  it("user-specific GETs are private + revalidate; errors and writes are never stored", async () => {
    const u = await account()
    const me = await request(app).get(`${A}/users/me`).set(auth(u.token))
    expect(me.headers["cache-control"]).toBe("private, no-cache")
    const missing = await request(app).get(`${A}/products/does-not-exist`)
    expect(missing.status).toBe(404)
    expect(missing.headers["cache-control"]).toBe("no-store") // not the route's public max-age
    const write = await request(app).post(`${A}/auth/logout`)
    expect(write.headers["cache-control"]).toBe("no-store")
  })

  it("exposes display-only currency config, cacheable for an hour", async () => {
    const res = await request(app).get(`${A}/config/public`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ baseCurrency: "INR", chargedCurrency: "INR" })
    expect(res.body.data.currencies.INR.rate).toBe(1)
    expect(res.headers["cache-control"]).toContain("max-age=3600")
  })
})

describe("cache layer (memory driver)", () => {
  it("runs the loader once per key, then serves hits", async () => {
    let calls = 0
    const load = async () => ({ n: ++calls })
    expect(await cached("t", "k", load)).toEqual({ n: 1 })
    expect(await cached("t", "k", load)).toEqual({ n: 1 })
    expect(await cached("t", "other", load)).toEqual({ n: 2 })
    expect(stats.hits).toBe(1)
  })

  it("invalidate() makes the old entries unreachable", async () => {
    let calls = 0
    const load = async () => ++calls
    await cached("v", "k", load)
    await invalidate("v")
    expect(await cached("v", "k", load)).toBe(2)
  })

  it("a product write busts the cached category counts (model hook)", async () => {
    const before = await request(app).get(`${A}/categories`)
    expect(before.body.data[0].productCount).toBe(1)
    await Product.create({
      name: "Phone 2",
      slug: "phone-2",
      sku: "PH2",
      brand: "Acme",
      category: (await Category.findOne())!._id,
      categoryPath: [(await Category.findOne())!._id],
      price: 500,
      mrp: 600,
      stock: 3,
    })
    const after = await request(app).get(`${A}/categories`)
    expect(after.body.data[0].productCount).toBe(2)
  })
})

describe("jobs (in-process driver)", () => {
  it("retries a failing job with backoff and then succeeds", async () => {
    let attempts = 0
    registerJob("test.flaky", async () => {
      if (++attempts < 3) throw new Error("boom")
    })
    await enqueue("test.flaky", {})
    await drainJobs()
    expect(attempts).toBe(3)
  })
})

describe("price drop alerts (admin price change -> job -> wishlisters)", () => {
  it("notifies wishlisters of a DROP only, audits it, and busts the cache", async () => {
    const admin = await account("admin")
    const fan = await account()
    await WishlistItem.create({ user: fan.id, product: productId })

    const drop = await request(app)
      .patch(`${A}/admin/products/${productId}/price`)
      .set(auth(admin.token))
      .send({ price: 800 })
    expect(drop.status).toBe(200)
    expect(drop.body.data).toMatchObject({
      from: 1000,
      to: 800,
      wishlistAlertQueued: true,
    })
    await drainJobs()
    const n = await Notification.find({ user: fan.id, type: "price.drop" })
    expect(n).toHaveLength(1)
    expect(n[0]!.title).toContain("Phone")

    const rise = await request(app)
      .patch(`${A}/admin/products/${productId}/price`)
      .set(auth(admin.token))
      .send({ price: 900 })
    expect(rise.body.data.wishlistAlertQueued).toBe(false)
    await drainJobs()
    expect(await Notification.countDocuments({ user: fan.id, type: "price.drop" })).toBe(
      1
    )

    const log = await AuditLog.find({ action: "PATCH /admin/products/:id/price" })
    expect(log).toHaveLength(2)
    expect(log[0]!.targets).toContain(productId)
  })

  it("refuses customers and anonymous callers; validates the price", async () => {
    const admin = await account("admin")
    const shopper = await account()
    const url = `${A}/admin/products/${productId}/price`
    expect((await request(app).patch(url).send({ price: 1 })).status).toBe(401)
    expect(
      (await request(app).patch(url).set(auth(shopper.token)).send({ price: 1 })).status
    ).toBe(403)
    expect(
      (await request(app).patch(url).set(auth(admin.token)).send({ price: 12.5 })).status
    ).toBe(422)
    // Above the list price (mrp 2000) is a business-rule 400.
    expect(
      (await request(app).patch(url).set(auth(admin.token)).send({ price: 2500 })).status
    ).toBe(400)
    // Failed attempts are not audited as changes.
    expect(await AuditLog.countDocuments()).toBe(0)
  })
})

describe("audit log", () => {
  it("lists entries for admins, filterable by target; customers get 403", async () => {
    const admin = await account("admin")
    const shopper = await account()
    await request(app)
      .patch(`${A}/admin/products/${productId}/price`)
      .set(auth(admin.token))
      .send({ price: 700 })
    const res = await request(app)
      .get(`${A}/admin/audit-logs?target=${productId}`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.meta.total).toBe(1)
    expect(res.body.data[0]).toMatchObject({
      action: "PATCH /admin/products/:id/price",
      status: 200,
      role: "admin",
      actor: { id: admin.id },
    })
    expect(JSON.stringify(res.body)).not.toContain("700") // no request bodies are stored
    expect(
      (await request(app).get(`${A}/admin/audit-logs`).set(auth(shopper.token))).status
    ).toBe(403)
    expect((await request(app).get(`${A}/admin/audit-logs`)).status).toBe(401)
  })

  it("validates filters", async () => {
    const admin = await account("admin")
    const res = await request(app)
      .get(`${A}/admin/audit-logs?actor=not-an-id`)
      .set(auth(admin.token))
    expect(res.status).toBe(422)
  })
})

describe("web vitals beacon", () => {
  it("stores a valid report (204) and summarises p75 for admins", async () => {
    for (const value of [1000, 2000, 3000, 4000])
      expect(
        (
          await request(app)
            .post(`${A}/metrics/vitals`)
            .send({
              name: "LCP",
              value,
              path: "/products",
              connection: "4g",
              ua: "mobile",
            })
        ).status
      ).toBe(204)
    const admin = await account("admin")
    const res = await request(app).get(`${A}/admin/metrics/vitals`).set(auth(admin.token))
    expect(res.body.data).toEqual([
      { name: "LCP", path: "/products", samples: 4, p75: 3000 },
    ])
  })

  it("rejects bad names and paths that carry a query string", async () => {
    const bad = await request(app)
      .post(`${A}/metrics/vitals`)
      .send({ name: "NOPE", value: 1, path: "/x?token=abc" })
    expect(bad.status).toBe(422)
    expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      "name",
      "path",
    ])
  })
})

describe("expire unpaid orders (job)", () => {
  async function pendingOrder() {
    const u = await account()
    const addr = await Address.create({
      user: u.id,
      fullName: "Pay User",
      phone: "9876543210",
      line1: "1 Main Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      isDefault: true,
    })
    await request(app)
      .post(`${A}/cart/items`)
      .set(auth(u.token))
      .send({ productId, qty: 2 })
    const res = await request(app)
      .post(`${A}/orders`)
      .set({ ...auth(u.token), "Idempotency-Key": `b12-key-${seq++}-${Date.now()}-x` })
      .send({ addressId: String(addr._id), paymentMethod: "razorpay" })
    expect(res.status).toBe(201)
    return { u, id: res.body.data.id as string }
  }

  it("cancels stale pending_payment orders and returns the reserved stock", async () => {
    const { id } = await pendingOrder()
    expect((await Product.findById(productId))!.stock).toBe(8)
    // Fresh order: untouched.
    expect(await expireUnpaidOrders(30)).toBe(0)
    // 31 minutes later it is stale.
    expect(await expireUnpaidOrders(30, Date.now() + 31 * 60_000)).toBe(1)
    const order = await Order.findById(id)
    expect(order!.status).toBe("cancelled")
    expect(order!.cancelReason).toMatch(/not completed in time/)
    expect((await Product.findById(productId))!.stock).toBe(10)
    // Idempotent: a second sweep finds nothing.
    expect(await expireUnpaidOrders(30, Date.now() + 31 * 60_000)).toBe(0)
  })

  it("leaves paid and COD orders alone", async () => {
    const { id } = await pendingOrder()
    await Order.updateOne({ _id: id }, { "payment.status": "paid" })
    expect(await expireUnpaidOrders(30, Date.now() + 31 * 60_000)).toBe(0)
    expect((await Order.findById(id))!.status).toBe("pending_payment")
  })
})

describe("Redis rate-limit store (fake client)", () => {
  it("increments atomically per key and resets", async () => {
    const counts = new Map<string, number>()
    const fake = {
      eval: async (_s: string, _n: number, key: string) => {
        counts.set(key, (counts.get(key) ?? 0) + 1)
        return [counts.get(key), 60_000]
      },
      decr: async (key: string) => counts.set(key, (counts.get(key) ?? 1) - 1),
      del: async (key: string) => counts.delete(key),
    }
    const store = new RedisRateLimitStore(fake as never, "rl:test")
    store.init({ windowMs: 60_000 } as never)
    expect((await store.increment("1.2.3.4")).totalHits).toBe(1)
    expect((await store.increment("1.2.3.4")).totalHits).toBe(2)
    expect((await store.increment("5.6.7.8")).totalHits).toBe(1)
    await store.resetKey("1.2.3.4")
    expect((await store.increment("1.2.3.4")).totalHits).toBe(1)
  })
})
