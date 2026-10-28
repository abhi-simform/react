import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Product } from "../src/modules/products/product.model.js"

const app = createApp()
const api = "/api/v1"

beforeEach(async () => {
  const root = await Category.create({ name: "Electronics", slug: "electronics" })
  const phones = await Category.create({
    name: "Mobiles",
    slug: "mobiles",
    parent: root._id,
    ancestors: [root._id],
  })
  const laptops = await Category.create({
    name: "Laptops",
    slug: "laptops",
    parent: root._id,
    ancestors: [root._id],
    sortOrder: 1,
  })
  await Category.create({ name: "Hidden", slug: "hidden", isActive: false })
  const mk = (
    sku: string,
    brand: string,
    cat: typeof phones,
    extra: Record<string, unknown> = {}
  ) => ({
    name: `${brand} ${sku}`,
    slug: sku.toLowerCase(),
    sku,
    brand,
    category: cat._id,
    categoryPath: [root._id, cat._id],
    images: [{ url: "https://x.test/a.png" }],
    price: 1000,
    mrp: 1000,
    stock: 5,
    ratingAvg: 4.5,
    ...extra,
  })
  await Product.create([
    mk("P1", "Apple", phones, { price: 70000, mrp: 70000 }),
    mk("P2", "Apple", phones, { price: 50000, mrp: 50000, ratingAvg: 3.2 }),
    mk("P3", "Samsung", phones, { price: 20000, mrp: 20000, stock: 0 }),
    mk("L1", "Dell", laptops, { price: 40000, mrp: 40000 }),
    mk("D1", "Apple", phones, { status: "draft" }),
  ])
})

describe("GET /categories", () => {
  it("returns the tree with subtree product counts and hides inactive nodes", async () => {
    const res = await request(app).get(`${api}/categories`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const [root] = res.body.data
    expect(root).toMatchObject({ slug: "electronics", productCount: 4 })
    expect(root.children.map((c: { slug: string }) => c.slug)).toEqual([
      "mobiles",
      "laptops",
    ])
    expect(root.children[0].productCount).toBe(3) // draft excluded
  })
})

describe("GET /categories/:slug", () => {
  it("returns ancestors (root first), children and count", async () => {
    const res = await request(app).get(`${api}/categories/mobiles`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      slug: "mobiles",
      parent: expect.any(String),
      productCount: 3,
      children: [],
    })
    expect(res.body.data.ancestors.map((a: { slug: string }) => a.slug)).toEqual([
      "electronics",
    ])
    const root = await request(app).get(`${api}/categories/electronics`)
    expect(root.body.data.ancestors).toEqual([])
    expect(root.body.data.children).toHaveLength(2)
  })

  it("404s for unknown and inactive categories", async () => {
    expect((await request(app).get(`${api}/categories/nope`)).status).toBe(404)
    const hidden = await request(app).get(`${api}/categories/hidden`)
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.code).toBe("NOT_FOUND")
  })
})

describe("GET /brands", () => {
  it("lists brands with counts, optionally scoped to a category subtree", async () => {
    const all = await request(app).get(`${api}/brands`)
    expect(all.body.data).toEqual([
      { name: "Apple", count: 2 },
      { name: "Dell", count: 1 },
      { name: "Samsung", count: 1 },
    ])
    const laptops = await request(app).get(`${api}/brands?category=laptops`)
    expect(laptops.body.data).toEqual([{ name: "Dell", count: 1 }])
    const unknown = await request(app).get(`${api}/brands?category=nope`)
    expect(unknown.body.data).toEqual([])
  })

  it("validates the query", async () => {
    expect((await request(app).get(`${api}/brands?category=`)).status).toBe(422)
  })
})

describe("GET /products?facets=true", () => {
  it("omits facets by default", async () => {
    const res = await request(app).get(`${api}/products`)
    expect(res.body.meta.facets).toBeUndefined()
  })

  it("returns brand/price/rating/stock facets", async () => {
    const res = await request(app).get(`${api}/products?facets=true`)
    const f = res.body.meta.facets
    expect(f.brands).toEqual([
      { value: "Apple", count: 2 },
      { value: "Dell", count: 1 },
      { value: "Samsung", count: 1 },
    ])
    expect(f.price).toEqual({ min: 20000, max: 70000 })
    expect(f.rating.find((r: { value: number }) => r.value === 4).count).toBe(3)
    expect(f.rating.find((r: { value: number }) => r.value === 3).count).toBe(4)
    expect(f.inStock.count).toBe(3)
  })

  it("brand facet is disjunctive: other brands keep their counts while one is selected", async () => {
    const res = await request(app).get(
      `${api}/products?facets=true&brand=Apple&category=mobiles`
    )
    expect(res.body.meta.total).toBe(2)
    expect(res.body.meta.facets.brands).toEqual([
      { value: "Apple", count: 2 },
      { value: "Samsung", count: 1 },
    ])
    // ...but the other filters still narrow the brand counts
    const narrowed = await request(app).get(
      `${api}/products?facets=true&brand=Apple&category=mobiles&inStock=true`
    )
    expect(narrowed.body.meta.facets.brands).toEqual([{ value: "Apple", count: 2 }])
  })

  it("price facet ignores the price filter; empty and unknown category give zeros", async () => {
    const res = await request(app).get(`${api}/products?facets=true&minPrice=60000`)
    expect(res.body.meta.facets.price).toEqual({ min: 20000, max: 70000 })
    const none = await request(app).get(`${api}/products?facets=true&category=nope`)
    expect(none.body.data).toEqual([])
    expect(none.body.meta.facets.brands).toEqual([])
  })

  it("rejects a bad facets value", async () => {
    expect((await request(app).get(`${api}/products?facets=yes`)).status).toBe(422)
  })
})
