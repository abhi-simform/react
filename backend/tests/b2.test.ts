import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { Address } from "../src/modules/addresses/address.model.js"

const app = createApp()
const A = "/api/v1/addresses"
const W = "/api/v1/wishlist"

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

const addr = (over: object = {}) => ({
  fullName: "Casey Customer",
  phone: "9876543210",
  line1: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  ...over,
})

let productIds: string[] = []
beforeEach(async () => {
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const base = {
    category: cat._id,
    categoryPath: [cat._id],
    brand: "Acme",
    images: [],
    stock: 5,
    mrp: 200,
  }
  const docs = await Product.create([
    { ...base, name: "One", slug: "one", sku: "S1", price: 100 },
    { ...base, name: "Two", slug: "two", sku: "S2", price: 100 },
    {
      ...base,
      name: "Hidden",
      slug: "hidden",
      sku: "S3",
      price: 100,
      status: "archived",
    },
  ])
  productIds = docs.map((d) => String(d._id))
})

describe("addresses", () => {
  it("rejects anonymous access with 401", async () => {
    expect((await request(app).get(A)).status).toBe(401)
  })

  it("first address becomes default; a new default demotes the old one", async () => {
    const { token } = await login("a@example.com")
    const first = await request(app).post(A).set(auth(token)).send(addr())
    expect(first.status).toBe(201)
    expect(first.body.data.isDefault).toBe(true)
    const second = await request(app)
      .post(A)
      .set(auth(token))
      .send(addr({ city: "Pune" }))
    expect(second.body.data.isDefault).toBe(false)
    const third = await request(app)
      .post(A)
      .set(auth(token))
      .send(addr({ isDefault: true, pincode: "411045" }))
    expect(third.body.data.isDefault).toBe(true)
    const list = await request(app).get(A).set(auth(token))
    expect(list.body.data).toHaveLength(3)
    expect(
      list.body.data.filter((a: { isDefault: boolean }) => a.isDefault)
    ).toHaveLength(1)
    expect(list.body.data[0].id).toBe(third.body.data.id) // default sorts first
  })

  it("validates input with field details (bad phone, bad and unserviceable pincode)", async () => {
    const { token } = await login("a@example.com")
    const bad = await request(app)
      .post(A)
      .set(auth(token))
      .send(addr({ phone: "123", pincode: "12" }))
    expect(bad.status).toBe(422)
    expect(bad.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      "phone",
      "pincode",
    ])
    const blocked = await request(app)
      .post(A)
      .set(auth(token))
      .send(addr({ pincode: "193101" }))
    expect(blocked.status).toBe(422)
    expect(blocked.body.error.details[0].path).toBe("pincode")
  })

  it("updates partially, sets default, and hides other users' addresses (404)", async () => {
    const u1 = await login("a@example.com")
    const u2 = await login("b@example.com")
    const a1 = (await request(app).post(A).set(auth(u1.token)).send(addr())).body.data
    const a2 = (
      await request(app)
        .post(A)
        .set(auth(u1.token))
        .send(addr({ city: "Pune" }))
    ).body.data

    const patched = await request(app)
      .patch(`${A}/${a2.id}`)
      .set(auth(u1.token))
      .send({ landmark: "Gate 2" })
    expect(patched.body.data).toMatchObject({ landmark: "Gate 2", city: "Pune" })
    expect(
      (await request(app).patch(`${A}/${a2.id}`).set(auth(u1.token)).send({})).status
    ).toBe(422)

    const def = await request(app).post(`${A}/${a2.id}/default`).set(auth(u1.token))
    expect(def.body.data.isDefault).toBe(true)
    const list = await request(app).get(A).set(auth(u1.token))
    expect(list.body.data.find((a: { id: string }) => a.id === a1.id).isDefault).toBe(
      false
    )

    expect(
      (await request(app).patch(`${A}/${a1.id}`).set(auth(u2.token)).send({ city: "X1" }))
        .status
    ).toBe(404)
    expect((await request(app).delete(`${A}/${a1.id}`).set(auth(u2.token))).status).toBe(
      404
    )
  })

  it("deleting the default auto-promotes the newest remaining address", async () => {
    const { token } = await login("a@example.com")
    const a1 = (await request(app).post(A).set(auth(token)).send(addr())).body.data
    const a2 = (
      await request(app)
        .post(A)
        .set(auth(token))
        .send(addr({ city: "Pune" }))
    ).body.data
    const del = await request(app).delete(`${A}/${a1.id}`).set(auth(token))
    expect(del.status).toBe(200)
    expect(del.body.data).toEqual({ deletedId: a1.id, newDefaultId: a2.id })
    const list = await request(app).get(A).set(auth(token))
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].isDefault).toBe(true)
    // deleting the last one leaves nothing, no error
    const last = await request(app).delete(`${A}/${a2.id}`).set(auth(token))
    expect(last.body.data.newDefaultId).toBeNull()
  })

  it("caps addresses at 10 with 409 ADDRESS_LIMIT", async () => {
    const { token, id } = await login("a@example.com")
    await Address.insertMany(
      Array.from({ length: 10 }, (_, i) => ({ ...addr(), user: id, isDefault: i === 0 }))
    )
    const res = await request(app).post(A).set(auth(token)).send(addr())
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("ADDRESS_LIMIT")
  })

  it("never ends up with two defaults under concurrent set-default calls", async () => {
    const { token, id } = await login("a@example.com")
    const ids: string[] = []
    for (let i = 0; i < 3; i++)
      ids.push((await request(app).post(A).set(auth(token)).send(addr())).body.data.id)
    await Promise.all(
      ids.map((x) => request(app).post(`${A}/${x}/default`).set(auth(token)))
    )
    expect(await Address.countDocuments({ user: id, isDefault: true })).toBe(1)
  })
})

describe("wishlist", () => {
  it("requires auth", async () => {
    expect((await request(app).get(W)).status).toBe(401)
    expect((await request(app).post(W).send({ productId: productIds[0] })).status).toBe(
      401
    )
  })

  it("adds idempotently, lists ids and products, removes idempotently", async () => {
    const { token } = await login("a@example.com")
    const add1 = await request(app)
      .post(W)
      .set(auth(token))
      .send({ productId: productIds[0] })
    expect(add1.status).toBe(201)
    const add2 = await request(app)
      .post(W)
      .set(auth(token))
      .send({ productId: productIds[0] })
    expect(add2.status).toBe(200)
    await request(app).post(W).set(auth(token)).send({ productId: productIds[1] })

    const ids = await request(app).get(`${W}/ids`).set(auth(token))
    expect(ids.body.data).toEqual([productIds[1], productIds[0]]) // newest first
    const list = await request(app).get(W).set(auth(token))
    expect(list.body.data).toHaveLength(2)
    expect(list.body.data[0]).toMatchObject({ name: "Two" })
    expect(list.body.meta).toMatchObject({ total: 2, totalPages: 1 })

    expect(
      (await request(app).delete(`${W}/${productIds[0]}`).set(auth(token))).status
    ).toBe(204)
    expect(
      (await request(app).delete(`${W}/${productIds[0]}`).set(auth(token))).status
    ).toBe(204)
    expect((await request(app).get(`${W}/ids`).set(auth(token))).body.data).toEqual([
      productIds[1],
    ])
  })

  it("is per-user, validates ids, and 404s on unknown/archived products", async () => {
    const u1 = await login("a@example.com")
    const u2 = await login("b@example.com")
    await request(app).post(W).set(auth(u1.token)).send({ productId: productIds[0] })
    expect((await request(app).get(`${W}/ids`).set(auth(u2.token))).body.data).toEqual([])
    expect(
      (await request(app).post(W).set(auth(u1.token)).send({ productId: "nope" })).status
    ).toBe(422)
    const missing = await request(app)
      .post(W)
      .set(auth(u1.token))
      .send({ productId: "a".repeat(24) })
    expect(missing.status).toBe(404)
    const archived = await request(app)
      .post(W)
      .set(auth(u1.token))
      .send({ productId: productIds[2] })
    expect(archived.status).toBe(404)
  })

  it("double POST in parallel creates one row", async () => {
    const { token, id } = await login("a@example.com")
    await Promise.all([
      request(app).post(W).set(auth(token)).send({ productId: productIds[0] }),
      request(app).post(W).set(auth(token)).send({ productId: productIds[0] }),
    ])
    const ids = await request(app).get(`${W}/ids`).set(auth(token))
    expect(ids.body.data).toHaveLength(1)
    expect(id).toBeTruthy()
  })
})

describe("pincodes", () => {
  it("returns an estimate for a metro pincode without auth", async () => {
    const res = await request(app).get("/api/v1/pincodes/560001")
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      serviceable: true,
      zone: "metro",
      codAvailable: true,
      deliveryDays: { min: 1, max: 2 },
    })
    expect(new Date(res.body.data.estimatedDelivery.to).getTime()).toBeGreaterThan(
      new Date(res.body.data.estimatedDelivery.from).getTime()
    )
  })
  it("flags remote (no COD) and unserviceable pincodes; rejects malformed ones", async () => {
    const remote = await request(app).get("/api/v1/pincodes/791001")
    expect(remote.body.data).toMatchObject({ zone: "remote", codAvailable: false })
    const no = await request(app).get("/api/v1/pincodes/193101")
    expect(no.body.data).toEqual({ pincode: "193101", serviceable: false })
    expect((await request(app).get("/api/v1/pincodes/12ab")).status).toBe(422)
    expect((await request(app).get("/api/v1/pincodes/012345")).status).toBe(422)
  })
})
