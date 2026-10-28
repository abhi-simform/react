import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Coupon } from "../src/modules/coupons/coupon.model.js"
import { Deal } from "../src/modules/deals/deal.model.js"
import { Banner } from "../src/modules/banners/banner.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
const H = 3_600_000

async function login(email: string) {
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  return {
    token: res.body.data.accessToken as string,
    id: res.body.data.user.id as string,
  }
}
async function adminToken() {
  await login("admin@example.com")
  await User.updateOne({ email: "admin@example.com" }, { role: "admin" })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email: "admin@example.com", password: "Passw0rdOK" })
  return res.body.data.accessToken as string
}

let ids: string[] = []
let phones: string
beforeEach(async () => {
  const phonesCat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  phones = String(phonesCat._id)
  const bookCat = await Category.create({ name: "Books", slug: "books" })
  const mk = (n: string, cat: typeof phonesCat, price: number, stock = 50) => ({
    name: n,
    slug: n.toLowerCase(),
    sku: n,
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price,
    mrp: price * 2,
    stock,
  })
  const docs = await Product.create([
    mk("Phone", phonesCat, 1000),
    mk("Novel", bookCat, 300),
  ])
  ids = docs.map((d) => String(d._id))
})
const add = (t: string, productId: string, qty = 1) =>
  request(app).post(`${A}/cart/items`).set(auth(t)).send({ productId, qty })
const applyCode = (t: string, code: string) =>
  request(app).post(`${A}/cart/coupon`).set(auth(t)).send({ code })

describe("server time", () => {
  it("GET /time returns the server clock, uncached", async () => {
    const res = await request(app).get(`${A}/time`)
    expect(res.status).toBe(200)
    expect(Math.abs(res.body.data.epochMs - Date.now())).toBeLessThan(5000)
    expect(res.headers["cache-control"]).toBe("no-store")
  })
})

describe("coupons", () => {
  beforeEach(async () => {
    await Coupon.create([
      {
        code: "SAVE10",
        type: "percent",
        value: 10,
        maxDiscount: 50,
        minOrder: 500,
        perUserLimit: 2,
      },
      { code: "FLAT100", type: "flat", value: 100 },
      { code: "OLD", type: "flat", value: 10, expiresAt: new Date(Date.now() - H) },
      {
        code: "BOOKS",
        type: "flat",
        value: 40,
        categories: [(await Category.findOne({ slug: "books" }))!._id],
      },
      { code: "FIRST", type: "flat", value: 20, firstOrderOnly: true },
      { code: "ONE", type: "flat", value: 5, usageLimit: 1, usedCount: 1 },
    ])
  })

  it("applies a percent coupon with the cap and shows the discount in totals", async () => {
    const { token } = await login("c1@example.com")
    await add(token, ids[0]!, 2) // 2000
    const res = await applyCode(token, "save10")
    expect(res.status).toBe(200)
    expect(res.body.data.coupon).toMatchObject({ code: "SAVE10", discount: 50 })
    expect(res.body.data.totals).toMatchObject({ subtotal: 2000, discount: 50 })
    // (2000 - 50) = 1950; free shipping; tax 18% = 351
    expect(res.body.data.totals).toMatchObject({ shipping: 0, tax: 351, total: 2301 })
  })

  it("removing restores totals", async () => {
    const { token } = await login("c2@example.com")
    await add(token, ids[0]!)
    await applyCode(token, "FLAT100")
    const res = await request(app).delete(`${A}/cart/coupon`).set(auth(token))
    expect(res.body.data.coupon).toBeNull()
    expect(res.body.data.totals.discount).toBe(0)
  })

  it("rejects with a reason per rule (422 COUPON_INVALID)", async () => {
    const { token } = await login("c3@example.com")
    const empty = await applyCode(token, "FLAT100")
    expect(empty.body.error).toMatchObject({
      code: "COUPON_INVALID",
      details: { reason: "EMPTY_CART" },
    })
    await add(token, ids[1]!) // 300
    const reason = async (code: string) =>
      (await applyCode(token, code)).body.error?.details
    expect(await reason("NOPE")).toMatchObject({ reason: "UNKNOWN" })
    expect(await reason("OLD")).toMatchObject({ reason: "EXPIRED" })
    expect(await reason("SAVE10")).toMatchObject({
      reason: "MIN_ORDER",
      minOrder: 500,
      shortBy: 200,
    })
    expect(await reason("ONE")).toMatchObject({ reason: "EXHAUSTED" })
    const phoneOnly = await Coupon.create({
      code: "PHONES",
      type: "flat",
      value: 10,
      categories: [phones],
    })
    expect(phoneOnly.code).toBe("PHONES")
    expect(await reason("PHONES")).toMatchObject({ reason: "NOT_APPLICABLE" })
  })

  it("category coupons discount only the eligible lines", async () => {
    const { token } = await login("c4@example.com")
    await add(token, ids[0]!)
    await add(token, ids[1]!)
    const res = await applyCode(token, "BOOKS")
    expect(res.body.data.totals.discount).toBe(40)
  })

  it("needs a real login and valid input", async () => {
    expect(
      (await request(app).post(`${A}/cart/coupon`).send({ code: "SAVE10" })).status
    ).toBe(401)
    const { token } = await login("c5@example.com")
    expect((await applyCode(token, "")).status).toBe(422)
  })

  it("an applied coupon that expires later shows an error on the cart instead of a discount", async () => {
    const { token } = await login("c6@example.com")
    await add(token, ids[0]!)
    await applyCode(token, "FLAT100")
    await Coupon.updateOne(
      { code: "FLAT100" },
      { expiresAt: new Date(Date.now() - 1000) }
    )
    const cart = await request(app).get(`${A}/cart`).set(auth(token))
    expect(cart.body.data.coupon).toMatchObject({
      code: "FLAT100",
      error: { reason: "EXPIRED" },
    })
    expect(cart.body.data.totals.discount).toBe(0)
  })

  it("lists available coupons checked against the cart", async () => {
    const { token } = await login("c7@example.com")
    await add(token, ids[1]!) // 300
    const res = await request(app).get(`${A}/coupons/available`).set(auth(token))
    expect(res.status).toBe(200)
    const byCode = Object.fromEntries(
      res.body.data.map((c: { code: string }) => [c.code, c])
    )
    expect(byCode.OLD).toBeUndefined()
    expect(byCode.ONE).toBeUndefined()
    expect(byCode.SAVE10).toMatchObject({ applicable: false, reason: "MIN_ORDER" })
    expect(byCode.FLAT100).toMatchObject({ applicable: true, discount: 100 })
  })

  it("admin can create coupons; customers cannot", async () => {
    const { token } = await login("c8@example.com")
    const body = { code: "NEW20", type: "percent", value: 20 }
    expect(
      (await request(app).post(`${A}/admin/coupons`).set(auth(token)).send(body)).status
    ).toBe(403)
    const admin = await adminToken()
    const res = await request(app).post(`${A}/admin/coupons`).set(auth(admin)).send(body)
    expect(res.status).toBe(201)
    expect(
      (await request(app).post(`${A}/admin/coupons`).set(auth(admin)).send(body)).status
    ).toBe(409)
    expect(
      (
        await request(app)
          .post(`${A}/admin/coupons`)
          .set(auth(admin))
          .send({ ...body, code: "BIG", value: 150 })
      ).status
    ).toBe(422)
  })
})

describe("deals", () => {
  it("lists live deals with server time, hides ended/upcoming, filters by category", async () => {
    await Deal.create([
      {
        product: ids[0],
        dealPrice: 700,
        startsAt: new Date(Date.now() - H),
        endsAt: new Date(Date.now() + H),
        stockLimit: 10,
        claimed: 4,
      },
      {
        product: ids[1],
        dealPrice: 200,
        startsAt: new Date(Date.now() - 3 * H),
        endsAt: new Date(Date.now() - H),
        stockLimit: 10,
      },
      {
        product: ids[1],
        dealPrice: 150,
        startsAt: new Date(Date.now() + H),
        endsAt: new Date(Date.now() + 2 * H),
        stockLimit: 10,
      },
    ])
    const res = await request(app).get(`${A}/deals`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({
      dealPrice: 700,
      remaining: 6,
      discountPercent: 65,
    })
    expect(res.body.data[0].product).toMatchObject({ price: 1000, name: "Phone" })
    expect(typeof res.body.meta.now).toBe("string")
    expect((await request(app).get(`${A}/deals?status=upcoming`)).body.data).toHaveLength(
      1
    )
    expect((await request(app).get(`${A}/deals?category=books`)).body.data).toHaveLength(
      0
    )
    expect((await request(app).get(`${A}/deals?status=bogus`)).status).toBe(422)
  })

  it("a live deal sets the product's deal field and the cart price; when it ends the price reverts", async () => {
    const deal = await Deal.create({
      product: ids[0],
      dealPrice: 700,
      startsAt: new Date(Date.now() - H),
      endsAt: new Date(Date.now() + H),
      stockLimit: 10,
    })
    const p = await request(app).get(`${A}/products/phone`)
    expect(p.body.data.deal).toMatchObject({ dealPrice: 700, remaining: 10 })
    const list = await request(app).get(`${A}/products`)
    expect(
      list.body.data.find((x: { sku: string }) => x.sku === "Phone").deal.dealPrice
    ).toBe(700)

    const { token } = await login("d1@example.com")
    const cart = await add(token, ids[0]!, 2)
    expect(cart.body.data.items[0]).toMatchObject({
      unitPrice: 700,
      deal: { dealPrice: 700 },
    })
    expect(cart.body.data.totals.subtotal).toBe(1400)

    await Deal.updateOne({ _id: deal._id }, { endsAt: new Date(Date.now() - 1000) })
    const after = await request(app).get(`${A}/cart`).set(auth(token))
    expect(after.body.data.items[0]).toMatchObject({
      unitPrice: 1000,
      deal: null,
      priceChanged: true,
    })
    expect((await request(app).get(`${A}/products/phone`)).body.data.deal).toBeNull()
  })

  it("a sold-out deal is not live", async () => {
    await Deal.create({
      product: ids[0],
      dealPrice: 700,
      startsAt: new Date(Date.now() - H),
      endsAt: new Date(Date.now() + H),
      stockLimit: 3,
      claimed: 3,
    })
    expect((await request(app).get(`${A}/deals`)).body.data).toHaveLength(0)
  })

  it("admin validates deals: price below regular, window order", async () => {
    const admin = await adminToken()
    const base = {
      productId: ids[0],
      dealPrice: 700,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + H),
      stockLimit: 5,
    }
    const post = (b: object) =>
      request(app).post(`${A}/admin/deals`).set(auth(admin)).send(b)
    expect((await post(base)).status).toBe(201)
    expect((await post({ ...base, dealPrice: 1000 })).status).toBe(400)
    expect((await post({ ...base, endsAt: new Date(Date.now() - H) })).status).toBe(422)
    expect((await request(app).post(`${A}/admin/deals`).send(base)).status).toBe(401)
  })
})

describe("banners", () => {
  it("serves only active banners in their window, ordered; admin links must be same-site", async () => {
    await Banner.create([
      { title: "B2", imageUrl: "https://x.test/2.jpg", linkUrl: "/b", sortOrder: 2 },
      { title: "B1", imageUrl: "https://x.test/1.jpg", linkUrl: "/a", sortOrder: 1 },
      { title: "Off", imageUrl: "https://x.test/3.jpg", linkUrl: "/c", isActive: false },
      {
        title: "Old",
        imageUrl: "https://x.test/4.jpg",
        linkUrl: "/d",
        endsAt: new Date(Date.now() - H),
      },
    ])
    const res = await request(app).get(`${A}/banners`)
    expect(res.body.data.map((b: { title: string }) => b.title)).toEqual(["B1", "B2"])
    const admin = await adminToken()
    const bad = await request(app)
      .post(`${A}/admin/banners`)
      .set(auth(admin))
      .send({ title: "X", imageUrl: "https://x.test/x.jpg", linkUrl: "//evil.com" })
    expect(bad.status).toBe(422)
  })
})

describe("GET /coupons/offers (public)", () => {
  it("lists live coupons without auth and without a cart, and hides expired ones", async () => {
    await Coupon.create([
      {
        code: "LIVE10",
        description: "10% off",
        type: "percent",
        value: 10,
        minOrder: 100,
      },
      {
        code: "OLD10",
        description: "Expired",
        type: "percent",
        value: 10,
        minOrder: 0,
        expiresAt: new Date(Date.now() - 1000),
      },
    ])
    const res = await request(app).get(`${A}/coupons/offers`)
    expect(res.status).toBe(200)
    expect(res.body.data.map((c: { code: string }) => c.code)).toEqual(["LIVE10"])
    expect(res.body.data[0]).toMatchObject({ type: "percent", value: 10, minOrder: 100 })
  })
})
