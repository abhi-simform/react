import request from "supertest"
import { Types } from "mongoose"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"
import { Cart } from "../src/modules/cart/cart.model.js"
import { RecentlyViewed } from "../src/modules/recommendations/recentlyViewed.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
const DAY = 86_400_000

async function account(email: string, role: "customer" | "seller" | "admin") {
  const reg = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  const id = reg.body.data.user.id as string
  if (role === "customer") return { token: reg.body.data.accessToken as string, id }
  await User.updateOne({ _id: id }, { role })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email, password: "Passw0rdOK" })
  return { token: res.body.data.accessToken as string, id }
}

let admin: { token: string; id: string }
let sellerA: { token: string; id: string }
let sellerB: { token: string; id: string }
let customer: { token: string; id: string }
let pA: InstanceType<typeof Product>
let pB: InstanceType<typeof Product>

const product = (
  name: string,
  seller: string,
  over: Record<string, unknown> & { category: Types.ObjectId }
) =>
  Product.create({
    name,
    slug: name.toLowerCase().replace(/\s/g, "-"),
    brand: "Nova",
    categoryPath: [over.category],
    price: 100,
    mrp: 120,
    sku: name.toUpperCase().replace(/\s/g, "-"),
    stock: 50,
    seller,
    ...over,
  })

async function order(
  daysAgo: number,
  status: string,
  lines: { p: InstanceType<typeof Product>; qty: number }[],
  extra: { shipping?: number; user?: string } = {}
) {
  const createdAt = new Date(Date.now() - daysAgo * DAY)
  const items = lines.map(({ p, qty }) => ({
    product: p._id,
    sku: p.sku,
    title: p.name,
    unitPrice: p.price,
    mrp: p.mrp,
    qty,
    lineTotal: p.price * qty,
  }))
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0)
  const shipping = extra.shipping ?? 0
  return Order.collection.insertOne({
    orderNumber: `T-${Math.random().toString(36).slice(2, 10)}`,
    user: new Types.ObjectId(extra.user ?? customer.id),
    items,
    status,
    statusHistory: [],
    pricing: { subtotal, discount: 0, shipping, tax: 0, total: subtotal + shipping },
    payment: { method: "cod", status: "pending" },
    createdAt,
    updatedAt: createdAt,
  })
}

beforeEach(async () => {
  const phones = await Category.create({ name: "Phones", slug: "phones" })
  const electronics = await Category.create({ name: "Electronics", slug: "electronics" })
  await Category.updateOne(
    { _id: phones._id },
    { parent: electronics._id, ancestors: [electronics._id] }
  )
  admin = await account("admin@example.com", "admin")
  sellerA = await account("sa@example.com", "seller")
  sellerB = await account("sb@example.com", "seller")
  customer = await account("c@example.com", "customer")
  pA = await product("Alpha Phone", sellerA.id, { category: phones._id, stock: 2 })
  pB = await product("Beta Cover", sellerB.id, {
    category: electronics._id,
    stock: 30,
    price: 150,
  })
  // Inside the last 30 days:
  await order(1, "delivered", [{ p: pA, qty: 2 }], { shipping: 40 }) // 200 (+40 shipping)
  await order(2, "placed", [
    { p: pA, qty: 1 },
    { p: pB, qty: 3 },
  ]) // 100 + 450
  await order(3, "cancelled", [{ p: pA, qty: 5 }]) // not revenue
  await order(4, "pending_payment", [{ p: pB, qty: 1 }]) // not revenue
  // The 30 days before that:
  await order(40, "delivered", [{ p: pB, qty: 1 }]) // 150
})

describe("admin analytics", () => {
  it("overview: revenue counts only sold orders, with the previous period for deltas", async () => {
    const res = await request(app)
      .get(`${A}/admin/analytics/overview?days=30`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.revenue).toEqual({ value: 790, previous: 150, deltaPct: 426.7 })
    expect(d.orders.value).toBe(2)
    expect(d.averageOrderValue.value).toBe(395)
    expect(d.unitsSold.value).toBe(6)
    expect(d.attention.toShip).toBe(1)
    expect(d.attention.lowStock).toBe(1) // Alpha Phone has stock 2 (threshold 5)
  })

  it("revenue series fills empty days with zeros and totals match", async () => {
    const res = await request(app)
      .get(`${A}/admin/analytics/revenue?days=7`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.data.points).toHaveLength(7)
    expect(res.body.data.total).toBe(790)
    expect(res.body.data.points.some((p: { revenue: number }) => p.revenue === 0)).toBe(
      true
    )
  })

  it("orders by status includes every status in the range", async () => {
    const res = await request(app)
      .get(`${A}/admin/analytics/orders-by-status?days=30`)
      .set(auth(admin.token))
    const by = Object.fromEntries(
      res.body.data.map((r: { status: string; count: number }) => [r.status, r.count])
    )
    expect(by).toEqual({ delivered: 1, placed: 1, cancelled: 1, pending_payment: 1 })
  })

  it("top products by revenue, category share rolled up to the root category", async () => {
    const top = await request(app)
      .get(`${A}/admin/analytics/top-products?days=30&limit=2`)
      .set(auth(admin.token))
    expect(top.body.data.map((p: { name: string }) => p.name)).toEqual([
      "Beta Cover",
      "Alpha Phone",
    ])
    expect(top.body.data[0]).toMatchObject({ revenue: 450, units: 3 })
    const share = await request(app)
      .get(`${A}/admin/analytics/category-share?days=30`)
      .set(auth(admin.token))
    expect(share.body.data).toHaveLength(1) // Phones + Electronics both roll up to Electronics
    expect(share.body.data[0]).toMatchObject({
      name: "Electronics",
      revenue: 750,
      sharePct: 100,
    })
  })

  it("low stock lists products at or under the threshold", async () => {
    const res = await request(app)
      .get(`${A}/admin/analytics/low-stock?threshold=30`)
      .set(auth(admin.token))
    expect(res.body.data.items.map((p: { name: string }) => p.name)).toEqual([
      "Alpha Phone",
      "Beta Cover",
    ])
  })

  it("funnel counts distinct signed-in shoppers per step", async () => {
    await RecentlyViewed.create({ user: customer.id, product: pA._id })
    await RecentlyViewed.create({ user: sellerA.id, product: pA._id })
    await Cart.create({
      user: customer.id,
      items: [{ product: pA._id, qty: 1, priceAtAdd: 100 }],
    })
    const res = await request(app)
      .get(`${A}/admin/analytics/funnel?days=30`)
      .set(auth(admin.token))
    expect(res.body.data.steps.map((s: { count: number }) => s.count)).toEqual([
      2, 1, 1, 1,
    ])
  })

  it("validates the range and refuses non-admins", async () => {
    const bad = await request(app)
      .get(`${A}/admin/analytics/overview?from=2026-02-10&to=2026-02-01`)
      .set(auth(admin.token))
    expect(bad.status).toBe(422)
    expect(bad.body.error.code).toBe("VALIDATION_ERROR")
    const seller = await request(app)
      .get(`${A}/admin/analytics/overview`)
      .set(auth(sellerA.token))
    expect(seller.status).toBe(403)
    expect((await request(app).get(`${A}/admin/analytics/overview`)).status).toBe(401)
  })

  it("an explicit from..to range is inclusive of both calendar days", async () => {
    const day = (n: number) =>
      new Date(Date.now() + 330 * 60_000 - n * DAY).toISOString().slice(0, 10)
    const res = await request(app)
      .get(`${A}/admin/analytics/revenue?from=${day(2)}&to=${day(1)}`)
      .set(auth(admin.token))
    expect(res.body.data.points).toHaveLength(2)
    expect(res.body.data.total).toBe(790)
  })
})

describe("seller analytics (own lines only)", () => {
  it("a seller's numbers cover only their products, never the order total", async () => {
    const res = await request(app)
      .get(`${A}/seller/analytics/overview?days=30`)
      .set(auth(sellerA.token))
    expect(res.status).toBe(200)
    // Alpha Phone lines: 2x100 (delivered, shipping excluded) + 1x100 (placed) = 300
    expect(res.body.data.revenue.value).toBe(300)
    expect(res.body.data.unitsSold.value).toBe(3)
    expect(res.body.data.newCustomers).toBeNull()
    const other = await request(app)
      .get(`${A}/seller/analytics/overview?days=30`)
      .set(auth(sellerB.token))
    expect(other.body.data.revenue.value).toBe(450) // 3x150 Beta Cover
    const top = await request(app)
      .get(`${A}/seller/analytics/top-products?days=30`)
      .set(auth(sellerA.token))
    expect(top.body.data.map((p: { name: string }) => p.name)).toEqual(["Alpha Phone"])
    const low = await request(app)
      .get(`${A}/seller/analytics/low-stock?threshold=100`)
      .set(auth(sellerA.token))
    expect(low.body.data.items).toHaveLength(1)
  })

  it("has no funnel and refuses customers", async () => {
    expect(
      (await request(app).get(`${A}/seller/analytics/funnel`).set(auth(sellerA.token)))
        .status
    ).toBe(404)
    expect(
      (await request(app).get(`${A}/seller/analytics/overview`).set(auth(customer.token)))
        .status
    ).toBe(403)
  })
})

describe("my spending (storefront)", () => {
  it("sums the caller's sold orders per month, zero-filled", async () => {
    const res = await request(app)
      .get(`${A}/me/spending?months=3`)
      .set(auth(customer.token))
    expect(res.status).toBe(200)
    expect(res.body.data.points).toHaveLength(3)
    expect(res.body.data.total).toBeGreaterThanOrEqual(790)
    const other = await request(app).get(`${A}/me/spending`).set(auth(sellerA.token))
    expect(other.body.data.total).toBe(0) // someone else's orders never count
    expect((await request(app).get(`${A}/me/spending`)).status).toBe(401)
  })
})
