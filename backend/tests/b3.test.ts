import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Cart } from "../src/modules/cart/cart.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Product } from "../src/modules/products/product.model.js"

const app = createApp()
const C = "/api/v1/cart"
const TOKEN = "guest-token-aaaaaaaaaaaa"
const TOKEN2 = "guest-token-bbbbbbbbbbbb"

async function login(email: string) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  return {
    token: res.body.data.accessToken as string,
    id: res.body.data.user.id as string,
  }
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
const guest = (t = TOKEN) => ({ "x-cart-token": t })

let ids: string[] = []
beforeEach(async () => {
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const base = {
    category: cat._id,
    categoryPath: [cat._id],
    brand: "Acme",
    images: [],
    mrp: 200,
  }
  const docs = await Product.create([
    { ...base, name: "One", slug: "one", sku: "S1", price: 100, stock: 5 },
    { ...base, name: "Two", slug: "two", sku: "S2", price: 150, stock: 50 },
    { ...base, name: "Gone", slug: "gone", sku: "S3", price: 100, stock: 0 },
    {
      ...base,
      name: "Hidden",
      slug: "hidden",
      sku: "S4",
      price: 100,
      stock: 9,
      status: "archived",
    },
  ])
  ids = docs.map((d) => String(d._id))
})

const add = (headers: Record<string, string>, productId: string, qty?: number) =>
  request(app).post(`${C}/items`).set(headers).send({ productId, qty })

describe("cart: identity and auth", () => {
  it("needs a Bearer token or a valid x-cart-token (400 CART_TOKEN_REQUIRED)", async () => {
    const none = await request(app).get(C)
    expect(none.status).toBe(400)
    expect(none.body.error.code).toBe("CART_TOKEN_REQUIRED")
    expect((await request(app).get(C).set("x-cart-token", "short")).status).toBe(400)
  })

  it("rejects an invalid Bearer token with 401 instead of treating it as a guest", async () => {
    const res = await request(app)
      .get(C)
      .set({ Authorization: "Bearer nope", ...guest() })
    expect(res.status).toBe(401)
  })

  it("an unknown guest token is simply an empty cart (nothing is created by reading)", async () => {
    const res = await request(app).get(C).set(guest())
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ items: [], saved: [], hasIssues: false })
    expect(res.body.data.totals).toMatchObject({ subtotal: 0, unitCount: 0 })
    expect(await Cart.countDocuments()).toBe(0)
  })

  it("guest and user carts are separate", async () => {
    const { token } = await login("a@example.com")
    await add(guest(), ids[0]!, 2)
    expect((await request(app).get(C).set(auth(token))).body.data.items).toHaveLength(0)
    expect((await request(app).get(C).set(guest(TOKEN2))).body.data.items).toHaveLength(0)
    expect((await request(app).get(C).set(guest())).body.data.items).toHaveLength(1)
  })
})

describe("cart: add / update / delete with stock validation", () => {
  it("adds, increments an existing line, and computes totals", async () => {
    const r1 = await add(guest(), ids[0]!, 2)
    expect(r1.status).toBe(201)
    const r2 = await add(guest(), ids[0]!)
    expect(r2.body.data.items).toHaveLength(1)
    expect(r2.body.data.items[0]).toMatchObject({
      productId: ids[0],
      qty: 3,
      unitPrice: 100,
      availableQty: 5,
      priceChanged: false,
    })
    const r3 = await add(guest(), ids[1]!, 2)
    expect(r3.body.data.totals).toEqual({
      lineCount: 2,
      unitCount: 5,
      subtotal: 3 * 100 + 2 * 150,
      mrpTotal: 5 * 200,
      savings: 5 * 200 - 600,
    })
  })

  it("409 INSUFFICIENT_STOCK with details instead of silently clamping", async () => {
    await add(guest(), ids[0]!, 4)
    const res = await add(guest(), ids[0]!, 2) // 6 > stock 5
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK")
    expect(res.body.error.details).toEqual({ availableQty: 5, requested: 6, inCart: 4 })
    const out = await add(guest(), ids[2]!)
    expect(out.status).toBe(409)
    expect(out.body.error.details.availableQty).toBe(0)
    // the cart is unchanged by the failed attempts
    const cart = await request(app).get(C).set(guest())
    expect(cart.body.data.items.map((l: { qty: number }) => l.qty)).toEqual([4])
  })

  it("caps a line at 10 even when stock is higher", async () => {
    await add(guest(), ids[1]!, 10)
    expect((await add(guest(), ids[1]!)).status).toBe(409)
  })

  it("404 for unknown/archived products; 422 for bad input", async () => {
    expect((await add(guest(), "a".repeat(24))).status).toBe(404)
    expect((await add(guest(), ids[3]!)).status).toBe(404)
    expect((await add(guest(), "nope")).status).toBe(422)
    expect((await add(guest(), ids[0]!, 0)).status).toBe(422)
    expect((await add(guest(), ids[0]!, 1.5)).status).toBe(422)
  })

  it("PATCH sets qty with the stock check; DELETE removes idempotently", async () => {
    await add(guest(), ids[0]!, 1)
    const up = await request(app)
      .patch(`${C}/items/${ids[0]}`)
      .set(guest())
      .send({ qty: 5 })
    expect(up.body.data.items[0].qty).toBe(5)
    const bad = await request(app)
      .patch(`${C}/items/${ids[0]}`)
      .set(guest())
      .send({ qty: 6 })
    expect(bad.status).toBe(409)
    expect(
      (await request(app).patch(`${C}/items/${ids[0]}`).set(guest()).send({})).status
    ).toBe(422)
    expect(
      (await request(app).patch(`${C}/items/${ids[1]}`).set(guest()).send({ qty: 1 }))
        .status
    ).toBe(404)
    expect(
      (await request(app).delete(`${C}/items/${ids[0]}`).set(guest())).body.data.items
    ).toEqual([])
    expect((await request(app).delete(`${C}/items/${ids[0]}`).set(guest())).status).toBe(
      200
    )
  })

  it("parallel adds never exceed the stock and never duplicate the line", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => add(guest(), ids[0]!, 1)) // stock is 5
    )
    const okCount = results.filter((r) => r.status === 201).length
    const cart = await request(app).get(C).set(guest())
    expect(cart.body.data.items).toHaveLength(1)
    expect(cart.body.data.items[0].qty).toBe(okCount)
    expect(okCount).toBeLessThanOrEqual(5)
    expect(await Cart.countDocuments({ guestToken: TOKEN })).toBe(1)
  })

  it("works for a logged-in user with the Bearer token", async () => {
    const { token } = await login("a@example.com")
    const res = await add(auth(token), ids[1]!, 2)
    expect(res.status).toBe(201)
    expect((await request(app).get(C).set(auth(token))).body.data.totals.unitCount).toBe(
      2
    )
  })
})

describe("cart: save for later and warnings", () => {
  it("moves a line to saved and back, excluding saved lines from totals", async () => {
    await add(guest(), ids[0]!, 2)
    await add(guest(), ids[1]!, 1)
    const saved = await request(app)
      .patch(`${C}/items/${ids[1]}`)
      .set(guest())
      .send({ savedForLater: true })
    expect(saved.body.data.items).toHaveLength(1)
    expect(saved.body.data.saved.map((l: { productId: string }) => l.productId)).toEqual([
      ids[1],
    ])
    expect(saved.body.data.totals.subtotal).toBe(200)
    const back = await request(app)
      .patch(`${C}/items/${ids[1]}`)
      .set(guest())
      .send({ savedForLater: false })
    expect(back.body.data.items).toHaveLength(2)
    expect(back.body.data.saved).toHaveLength(0)
  })

  it("adding a saved product brings it back into the cart", async () => {
    await add(guest(), ids[0]!, 1)
    await request(app)
      .patch(`${C}/items/${ids[0]}`)
      .set(guest())
      .send({ savedForLater: true })
    const res = await add(guest(), ids[0]!, 1)
    expect(res.body.data.saved).toHaveLength(0)
    expect(res.body.data.items[0].qty).toBe(2)
  })

  it("cannot move a saved line back when it is out of stock (409)", async () => {
    await add(guest(), ids[0]!, 1)
    await request(app)
      .patch(`${C}/items/${ids[0]}`)
      .set(guest())
      .send({ savedForLater: true })
    await Product.updateOne({ _id: ids[0] }, { stock: 0 })
    const res = await request(app)
      .patch(`${C}/items/${ids[0]}`)
      .set(guest())
      .send({ savedForLater: false })
    expect(res.status).toBe(409)
  })

  it("flags price changes, reduced quantity and out-of-stock on the next read", async () => {
    await add(guest(), ids[0]!, 4)
    await add(guest(), ids[1]!, 1)
    await Product.updateOne({ _id: ids[0] }, { price: 80, stock: 2 })
    await Product.updateOne({ _id: ids[1] }, { stock: 0 })
    const cart = (await request(app).get(C).set(guest())).body.data
    const one = cart.items.find((l: { productId: string }) => l.productId === ids[0])
    const two = cart.items.find((l: { productId: string }) => l.productId === ids[1])
    expect(one).toMatchObject({
      priceChanged: true,
      previousPrice: 100,
      unitPrice: 80,
      qtyReduced: true,
      availableQty: 2,
      payableQty: 2,
    })
    expect(two).toMatchObject({ outOfStock: true, payableQty: 0 })
    expect(cart.hasIssues).toBe(true)
    // totals only count what can actually be bought
    expect(cart.totals).toMatchObject({ subtotal: 160, unitCount: 2 })

    const ack = await request(app).post(`${C}/acknowledge-prices`).set(guest())
    const after = ack.body.data.items.find(
      (l: { productId: string }) => l.productId === ids[0]
    )
    expect(after.priceChanged).toBe(false)
  })

  it("treats an archived product as unavailable instead of crashing", async () => {
    await add(guest(), ids[0]!, 1)
    await Product.updateOne({ _id: ids[0] }, { status: "archived" })
    const cart = (await request(app).get(C).set(guest())).body.data
    expect(cart.items[0]).toMatchObject({ outOfStock: true, availableQty: 0 })
  })
})

describe("cart: merge on login", () => {
  it("requires auth and a valid token", async () => {
    expect(
      (await request(app).post(`${C}/merge`).send({ guestToken: TOKEN })).status
    ).toBe(401)
    const { token } = await login("a@example.com")
    expect(
      (await request(app).post(`${C}/merge`).set(auth(token)).send({ guestToken: "x" }))
        .status
    ).toBe(422)
  })

  it("adds quantities, caps at stock, keeps saved flags, skips unavailable, deletes the guest cart", async () => {
    const { token, id } = await login("a@example.com")
    await add(auth(token), ids[0]!, 3) // user has 3 of "One" (stock 5)
    await add(guest(), ids[0]!, 4) // guest has 4 -> 7 > 5
    await add(guest(), ids[1]!, 2)
    await request(app)
      .patch(`${C}/items/${ids[1]}`)
      .set(guest())
      .send({ savedForLater: true })
    await add(guest(), ids[2]!, 1).catch(() => undefined) // out of stock: cannot even be added
    // force a line that has become unavailable since being added
    await Cart.updateOne(
      { guestToken: TOKEN },
      { $push: { items: { product: ids[3], qty: 1, priceAtAdd: 100 } } }
    )

    const res = await request(app)
      .post(`${C}/merge`)
      .set(auth(token))
      .send({ guestToken: TOKEN })
    expect(res.status).toBe(200)
    expect(res.body.data.merge.merged).toBe(2)
    expect(res.body.data.merge.adjusted).toEqual([
      { productId: ids[0], name: "One", requested: 7, applied: 5 },
    ])
    expect(res.body.data.merge.skipped).toEqual([
      { productId: ids[3], name: "Unavailable product", reason: "UNAVAILABLE" },
    ])
    expect(res.body.data.items[0].qty).toBe(5)
    expect(res.body.data.saved.map((l: { productId: string }) => l.productId)).toEqual([
      ids[1],
    ])
    expect(await Cart.countDocuments({ guestToken: TOKEN })).toBe(0)
    expect(await Cart.countDocuments({ user: id })).toBe(1)
  })

  it("merging into a user with no cart creates it; merging an unknown token is a no-op", async () => {
    const { token } = await login("a@example.com")
    const none = await request(app)
      .post(`${C}/merge`)
      .set(auth(token))
      .send({ guestToken: TOKEN2 })
    expect(none.body.data.items).toEqual([])
    expect(none.body.data.merge).toEqual({ merged: 0, adjusted: [], skipped: [] })
    await add(guest(), ids[1]!, 2)
    const res = await request(app)
      .post(`${C}/merge`)
      .set(auth(token))
      .send({ guestToken: TOKEN })
    expect(res.body.data.items[0].qty).toBe(2)
  })

  it("two simultaneous merges of the same guest cart do not double the quantities", async () => {
    const { token } = await login("a@example.com")
    await add(guest(), ids[1]!, 3)
    await Promise.all([
      request(app).post(`${C}/merge`).set(auth(token)).send({ guestToken: TOKEN }),
      request(app).post(`${C}/merge`).set(auth(token)).send({ guestToken: TOKEN }),
    ])
    const cart = await request(app).get(C).set(auth(token))
    expect(cart.body.data.items).toHaveLength(1)
    expect(cart.body.data.items[0].qty).toBe(3)
  })
})
