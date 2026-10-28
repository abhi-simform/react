import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { RecentlyViewed } from "../src/modules/recommendations/recentlyViewed.model.js"
import { resetVocabulary } from "../src/modules/search/search.service.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

let seq = 0
async function user() {
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Rec User", email: `rec${seq++}@example.com`, password: "Passw0rdOK" })
  return {
    token: res.body.data.accessToken as string,
    id: res.body.data.user.id as string,
  }
}

let P: Record<string, string> = {}
beforeEach(async () => {
  resetVocabulary()
  const root = await Category.create({ name: "Electronics", slug: "electronics" })
  const mobiles = await Category.create({
    name: "Mobiles",
    slug: "mobiles",
    parent: root._id,
    ancestors: [root._id],
  })
  const audio = await Category.create({
    name: "Headphones",
    slug: "headphones",
    parent: root._id,
    ancestors: [root._id],
  })
  const mk = (
    name: string,
    brand: string,
    cat: typeof mobiles,
    price: number,
    extra: object = {}
  ) => ({
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    sku: name,
    brand,
    category: cat._id,
    categoryPath: [root._id, cat._id],
    price,
    mrp: price * 2,
    stock: 10,
    ...extra,
  })
  const docs = await Product.create([
    mk("Samsung Galaxy S1", "Samsung", mobiles, 50000, {
      soldCount: 50,
      specs: [
        { key: "RAM", value: "8 GB" },
        { key: "Colour", value: "Black" },
      ],
    }),
    mk("Samsung Galaxy S2", "Samsung", mobiles, 52000, {
      soldCount: 40,
      specs: [
        { key: "RAM", value: "8 GB" },
        { key: "Battery", value: "5000 mAh" },
      ],
    }),
    mk("Apple Phone", "Apple", mobiles, 90000, { soldCount: 10 }),
    mk("Sony Buds", "Sony", audio, 3000, { soldCount: 5 }),
    mk("Samsung Archived", "Samsung", mobiles, 100, { status: "archived" }),
  ])
  P = Object.fromEntries(docs.map((d) => [d.name, String(d._id)]))
})

describe("GET /search/suggest", () => {
  it("groups products, categories and brands, most popular first", async () => {
    const res = await request(app).get(`${A}/search/suggest?q=sam`)
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.products.map((p: { name: string }) => p.name)).toEqual([
      "Samsung Galaxy S1",
      "Samsung Galaxy S2",
    ]) // the archived one is hidden
    expect(d.brands).toEqual([{ name: "Samsung", count: 2 }])
    expect(d.correction).toBeNull()
    const cats = await request(app).get(`${A}/search/suggest?q=head`)
    expect(cats.body.data.categories[0]).toMatchObject({ slug: "headphones" })
  })

  it("matches the start of any word", async () => {
    const res = await request(app).get(`${A}/search/suggest?q=galax`)
    expect(res.body.data.products).toHaveLength(2)
  })

  it("rejects a query shorter than 2 characters", async () => {
    const res = await request(app).get(`${A}/search/suggest?q=s`)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe("VALIDATION_ERROR")
  })

  it("treats regex characters as plain text", async () => {
    const res = await request(app).get(
      `${A}/search/suggest?q=${encodeURIComponent(".*")}`
    )
    expect(res.status).toBe(200)
    expect(res.body.data.products).toEqual([])
  })

  it("suggests a spelling correction only when nothing matched", async () => {
    const res = await request(app).get(`${A}/search/suggest?q=samsng`)
    expect(res.body.data.products).toEqual([])
    expect(res.body.data.correction).toBe("samsung")
    const none = await request(app).get(`${A}/search/suggest?q=zzzzzz`)
    expect(none.body.data.correction).toBeNull()
  })
})

describe("recently viewed", () => {
  it("requires auth", async () => {
    expect((await request(app).get(`${A}/me/recently-viewed`)).status).toBe(401)
    expect(
      (await request(app).post(`${A}/me/recently-viewed`).send({ items: [] })).status
    ).toBe(401)
  })

  it("records views, newest first, de-duplicated, ignoring archived products", async () => {
    const u = await user()
    const post = (items: object[]) =>
      request(app).post(`${A}/me/recently-viewed`).set(auth(u.token)).send({ items })
    expect((await post([{ productId: P["Apple Phone"] }])).status).toBe(202)
    await post([{ productId: P["Sony Buds"] }])
    await post([{ productId: P["Apple Phone"] }]) // viewing again moves it to the top
    await post([{ productId: P["Samsung Archived"] }])
    const list = await request(app).get(`${A}/me/recently-viewed`).set(auth(u.token))
    expect(list.body.data.map((p: { name: string }) => p.name)).toEqual([
      "Apple Phone",
      "Sony Buds",
    ])
    expect(await RecentlyViewed.countDocuments({ user: u.id })).toBe(2)
  })

  it("merges a guest list by its timestamps and never lets an older time win", async () => {
    const u = await user()
    const now = Date.now()
    await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({
        items: [
          { productId: P["Sony Buds"], viewedAt: new Date(now - 3000).toISOString() },
          { productId: P["Apple Phone"], viewedAt: new Date(now - 1000).toISOString() },
        ],
      })
    await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({
        items: [
          { productId: P["Apple Phone"], viewedAt: new Date(now - 9000).toISOString() },
        ],
      })
    const list = await request(app).get(`${A}/me/recently-viewed`).set(auth(u.token))
    expect(list.body.data.map((p: { name: string }) => p.name)).toEqual([
      "Apple Phone",
      "Sony Buds",
    ])
  })

  it("caps the list at 30 and can be cleared", async () => {
    const u = await user()
    const extra = await Product.insertMany(
      Array.from({ length: 32 }, (_, i) => ({
        name: `Bulk ${i}`,
        slug: `bulk-${i}`,
        sku: `BULK${i}`,
        brand: "Bulk",
        category: new Product()._id,
        price: 10,
        mrp: 20,
      }))
    )
    await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({
        items: extra.slice(0, 30).map((p, i) => ({
          productId: String(p._id),
          viewedAt: new Date(Date.now() - 50_000 + i).toISOString(),
        })),
      })
    await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({ items: extra.slice(30).map((p) => ({ productId: String(p._id) })) })
    expect(await RecentlyViewed.countDocuments({ user: u.id })).toBe(30)
    const del = await request(app).delete(`${A}/me/recently-viewed`).set(auth(u.token))
    expect(del.status).toBe(204)
    expect(await RecentlyViewed.countDocuments({ user: u.id })).toBe(0)
  })

  it("rejects a malformed product id", async () => {
    const u = await user()
    const res = await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({ items: [{ productId: "nope" }] })
    expect(res.status).toBe(422)
  })
})

describe("similar and also-bought", () => {
  it("ranks similar products by brand, price and category, excluding itself", async () => {
    const res = await request(app).get(`${A}/products/${P["Samsung Galaxy S1"]}/similar`)
    expect(res.status).toBe(200)
    const names = res.body.data.map((p: { name: string }) => p.name)
    expect(names[0]).toBe("Samsung Galaxy S2")
    expect(names).not.toContain("Samsung Galaxy S1")
    expect(names).not.toContain("Samsung Archived")
    expect(res.body.data[0]).toHaveProperty("deal")
    expect((await request(app).get(`${A}/products/nope/similar`)).status).toBe(404)
  })

  it("uses real co-purchases and says when it had to top up", async () => {
    const u = await user()
    const line = (name: string, price: number) => ({
      product: P[name]!,
      sku: name,
      title: name,
      unitPrice: price,
      mrp: price,
      qty: 1,
      lineTotal: price,
    })
    const base = {
      user: u.id,
      pricing: { subtotal: 1, discount: 0, shipping: 0, tax: 0, total: 1 },
      payment: { method: "cod" as const },
    }
    await Order.create([
      {
        ...base,
        orderNumber: "T-1",
        status: "delivered" as const,
        items: [line("Samsung Galaxy S1", 50000), line("Sony Buds", 3000)],
      },
      {
        ...base,
        orderNumber: "T-2",
        status: "placed" as const,
        items: [line("Samsung Galaxy S1", 50000), line("Sony Buds", 3000)],
      },
      {
        ...base,
        orderNumber: "T-3",
        status: "cancelled" as const, // never counts
        items: [line("Samsung Galaxy S1", 50000), line("Apple Phone", 90000)],
      },
    ])
    const res = await request(app).get(
      `${A}/products/${P["Samsung Galaxy S1"]}/also-bought?limit=2`
    )
    expect(res.status).toBe(200)
    expect(res.body.data[0].name).toBe("Sony Buds")
    expect(res.body.data.map((p: { name: string }) => p.name)).not.toContain(
      "Apple Phone"
    )
    expect(res.body.meta.source).toBe("mixed")
    const cold = await request(app).get(
      `${A}/products/${P["Apple Phone"]}/also-bought?limit=2`
    )
    expect(cold.body.meta.source).toBe("similar")
  })
})

describe("recommendations", () => {
  it("falls back to trending for a guest and says it is not personalised", async () => {
    const res = await request(app).get(`${A}/recommendations/for-you`)
    expect(res.status).toBe(200)
    expect(res.body.meta.personalised).toBe(false)
    expect(res.body.data[0].name).toBe("Samsung Galaxy S1")
  })

  it("personalises from the shopper's recently viewed, excluding what they viewed", async () => {
    const u = await user()
    await request(app)
      .post(`${A}/me/recently-viewed`)
      .set(auth(u.token))
      .send({ items: [{ productId: P["Sony Buds"] }] })
    const res = await request(app).get(`${A}/recommendations/for-you`).set(auth(u.token))
    expect(res.body.meta.personalised).toBe(true)
    expect(res.body.meta.basedOn).toEqual(["Headphones"])
    expect(res.body.data.map((p: { name: string }) => p.name)).not.toContain("Sony Buds")
  })

  it("lets a guest personalise with a local seed list", async () => {
    const res = await request(app).get(
      `${A}/recommendations/for-you?seed=${P["Apple Phone"]}`
    )
    expect(res.body.meta.personalised).toBe(true)
    const names = res.body.data.map((p: { name: string }) => p.name)
    expect(names).toContain("Samsung Galaxy S1")
    expect(names).not.toContain("Apple Phone")
  })

  it("trending can be scoped to a category", async () => {
    const res = await request(app).get(
      `${A}/recommendations/trending?category=headphones`
    )
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(["Sony Buds"])
  })
})

describe("compare", () => {
  it("aligns specs across products and marks differing rows", async () => {
    const ids = `${P["Samsung Galaxy S1"]},${P["Samsung Galaxy S2"]}`
    const res = await request(app).get(`${A}/products/compare?ids=${ids}`)
    expect(res.status).toBe(200)
    expect(res.body.data.products).toHaveLength(2)
    const byKey = Object.fromEntries(
      res.body.data.specs.map((s: { key: string }) => [s.key, s])
    )
    expect(byKey.RAM).toMatchObject({ values: ["8 GB", "8 GB"], differs: false })
    expect(byKey.Battery).toMatchObject({ values: [null, "5000 mAh"], differs: true })
  })

  it("validates the number of ids and 404s on unknown ones", async () => {
    expect(
      (await request(app).get(`${A}/products/compare?ids=${P["Sony Buds"]}`)).status
    ).toBe(422)
    const res = await request(app).get(
      `${A}/products/compare?ids=${P["Sony Buds"]},${P["Samsung Archived"]}`
    )
    expect(res.status).toBe(404)
  })
})
