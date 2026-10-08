import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { Types } from "mongoose"

const app = createApp()

beforeEach(async () => {
  const root = await Category.create({ name: "Electronics", slug: "electronics" })
  const phones = await Category.create({
    name: "Mobiles",
    slug: "mobiles",
    parent: root._id,
    ancestors: [root._id],
  })
  await Product.syncIndexes()
  const base = {
    category: phones._id,
    categoryPath: [root._id, phones._id],
    sku: "",
    images: [{ url: "https://x.test/a.png" }],
    stock: 10,
  }
  await Product.create([
    {
      ...base,
      name: "Apple iPhone 15",
      slug: "iphone-15",
      sku: "S1",
      brand: "Apple",
      price: 70000,
      mrp: 80000,
      ratingAvg: 4.6,
    },
    {
      ...base,
      name: "Samsung Galaxy S24",
      slug: "galaxy-s24",
      sku: "S2",
      brand: "Samsung",
      price: 60000,
      mrp: 90000,
      ratingAvg: 4.4,
    },
    {
      ...base,
      name: "Redmi Note 13",
      slug: "redmi-note-13",
      sku: "S3",
      brand: "Xiaomi",
      price: 15000,
      mrp: 18000,
      ratingAvg: 4.1,
      stock: 0,
    },
    {
      ...base,
      name: "Hidden Draft",
      slug: "draft",
      sku: "S4",
      brand: "Xiaomi",
      price: 1,
      mrp: 1,
      status: "draft",
    },
  ])
})

describe("GET /products", () => {
  it("lists only active products with pagination meta", async () => {
    const res = await request(app).get("/api/v1/products?limit=2")
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNext: true,
    })
  })

  it("filters by category slug, brand, price range and stock", async () => {
    expect(
      (await request(app).get("/api/v1/products?category=electronics")).body.meta.total
    ).toBe(3)
    expect(
      (await request(app).get("/api/v1/products?brand=apple,samsung")).body.meta.total
    ).toBe(2)
    expect(
      (await request(app).get("/api/v1/products?minPrice=10000&maxPrice=65000")).body.meta
        .total
    ).toBe(2)
    expect(
      (await request(app).get("/api/v1/products?inStock=true")).body.meta.total
    ).toBe(2)
  })

  it("sorts by price and computes discountPercent", async () => {
    const res = await request(app).get("/api/v1/products?sort=price_asc")
    expect(res.body.data.map((p: { price: number }) => p.price)).toEqual([
      15000, 60000, 70000,
    ])
    const galaxy = res.body.data.find((p: { slug: string }) => p.slug === "galaxy-s24")
    expect(galaxy.discountPercent).toBe(33)
  })

  it("full-text searches", async () => {
    const res = await request(app).get("/api/v1/products?search=galaxy")
    expect(res.body.data.map((p: { slug: string }) => p.slug)).toEqual(["galaxy-s24"])
  })

  it("validates query params", async () => {
    const res = await request(app).get(
      "/api/v1/products?minPrice=500&maxPrice=100&limit=999"
    )
    expect(res.status).toBe(422)
  })
})

describe("GET /products/:idOrSlug", () => {
  it("returns detail by slug and by id; 404 otherwise", async () => {
    const bySlug = await request(app).get("/api/v1/products/iphone-15")
    expect(bySlug.status).toBe(200)
    const byId = await request(app).get(`/api/v1/products/${bySlug.body.data._id}`)
    expect(byId.body.data.slug).toBe("iphone-15")
    expect((await request(app).get("/api/v1/products/draft")).status).toBe(404)
    expect(
      (await request(app).get(`/api/v1/products/${new Types.ObjectId()}`)).status
    ).toBe(404)
  })
})

describe("misc", () => {
  it("health + unknown route use the envelope", async () => {
    expect((await request(app).get("/api/v1/health")).body.data.db).toBe("up")
    const nf = await request(app).get("/api/v1/nope")
    expect(nf.status).toBe(404)
    expect(nf.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } })
  })
})
