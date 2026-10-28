import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Address } from "../src/modules/addresses/address.model.js"
import { Cart } from "../src/modules/cart/cart.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Coupon } from "../src/modules/coupons/coupon.model.js"
import { Deal } from "../src/modules/deals/deal.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const H = 3_600_000
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
let keyN = 0
const newKey = () => `test-key-${Date.now()}-${keyN++}-xxxx`

type Shopper = { token: string; id: string; addressId: string }
let seq = 0
async function shopper(pincode = "560001"): Promise<Shopper> {
  const email = `u${seq++}@example.com`
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  const id = res.body.data.user.id as string
  const addr = await Address.create({
    user: id,
    fullName: "Test User",
    phone: "9876543210",
    line1: "1 Main Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode,
    isDefault: true,
  })
  return { token: res.body.data.accessToken, id, addressId: String(addr._id) }
}
async function adminToken() {
  const email = `admin${seq++}@example.com`
  await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Admin", email, password: "Passw0rdOK" })
  await User.updateOne({ email }, { role: "admin" })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email, password: "Passw0rdOK" })
  return res.body.data.accessToken as string
}

let ids: string[] = []
beforeEach(async () => {
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const mk = (n: string, price: number, stock: number) => ({
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
    mk("Phone", 1000, 5),
    mk("Novel", 300, 50),
    mk("Scarce", 100, 2),
  ])
  ids = docs.map((d) => String(d._id))
})

const add = (s: Shopper, productId: string, qty = 1) =>
  request(app).post(`${A}/cart/items`).set(auth(s.token)).send({ productId, qty })
const place = (s: Shopper, over: object = {}, key = newKey()) =>
  request(app)
    .post(`${A}/orders`)
    .set({ ...auth(s.token), "Idempotency-Key": key })
    .send({ addressId: s.addressId, paymentMethod: "cod", ...over })
const stockOf = async (i: number) => (await Product.findById(ids[i]))!.stock

describe("place order (COD)", () => {
  it("creates the order, reserves stock, empties the cart but keeps saved lines", async () => {
    const s = await shopper()
    await add(s, ids[0]!, 2)
    await add(s, ids[1]!, 1)
    await request(app)
      .patch(`${A}/cart/items/${ids[1]}`)
      .set(auth(s.token))
      .send({ savedForLater: true })
    const res = await place(s, { deliverySlot: "2030-01-02|9-12" })
    expect(res.status).toBe(201)
    const o = res.body.data
    expect(o).toMatchObject({
      status: "placed",
      paymentMethod: "cod",
      pricing: { subtotal: 2000, discount: 0, shipping: 0, tax: 360, total: 2360 },
    })
    expect(o.orderNumber).toMatch(/^SS-\d{8}-[0-9A-F]{6}$/)
    expect(o.items).toHaveLength(1)
    expect(o.addressSnapshot).toMatchObject({ pincode: "560001", type: "home" })
    expect(o.statusHistory).toHaveLength(1)
    expect(await stockOf(0)).toBe(3)
    const cart = await request(app).get(`${A}/cart`).set(auth(s.token))
    expect(cart.body.data.items).toHaveLength(0)
    expect(cart.body.data.saved).toHaveLength(1)
  })

  it("needs a login, an Idempotency-Key and valid input", async () => {
    const s = await shopper()
    expect((await request(app).post(`${A}/orders`).send({})).status).toBe(401)
    await add(s, ids[1]!)
    const missing = await request(app)
      .post(`${A}/orders`)
      .set(auth(s.token))
      .send({ addressId: s.addressId, paymentMethod: "cod" })
    expect(missing.status).toBe(400)
    expect(missing.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED")
    expect((await place(s, { paymentMethod: "bitcoin" })).status).toBe(422)
  })

  it("rejects an empty cart and someone else's address", async () => {
    const s = await shopper()
    const other = await shopper()
    expect((await place(s)).body.error.code).toBe("CART_EMPTY")
    await add(s, ids[1]!)
    expect((await place(s, { addressId: other.addressId })).status).toBe(404)
  })

  it("is idempotent: a retry with the same key returns the same order", async () => {
    const s = await shopper()
    await add(s, ids[0]!, 1)
    const key = newKey()
    const a = await place(s, {}, key)
    const b = await place(s, {}, key)
    expect(a.status).toBe(201)
    expect(b.status).toBe(200)
    expect(b.headers["idempotent-replayed"]).toBe("true")
    expect(b.body.data.id).toBe(a.body.data.id)
    expect(await Order.countDocuments()).toBe(1)
    expect(await stockOf(0)).toBe(4)
    // same key, different request: a client bug
    const c = await place(s, { deliveryMethod: "express" }, key)
    expect(c.status).toBe(422)
    expect(c.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED")
  })

  it("parallel requests with one key (double click) create exactly one order", async () => {
    const s = await shopper()
    await add(s, ids[0]!, 1)
    const key = newKey()
    const rs = await Promise.all(Array.from({ length: 5 }, () => place(s, {}, key)))
    expect(rs.every((r) => [200, 201].includes(r.status))).toBe(true)
    expect(new Set(rs.map((r) => r.body.data.id)).size).toBe(1)
    expect(await Order.countDocuments()).toBe(1)
    expect(await stockOf(0)).toBe(4)
  })

  it("never oversells: 4 shoppers race for the last 2 units", async () => {
    const shoppers = await Promise.all(Array.from({ length: 4 }, () => shopper()))
    for (const s of shoppers) await add(s, ids[2]!, 1)
    const rs = await Promise.all(shoppers.map((s) => place(s)))
    const okCount = rs.filter((r) => r.status === 201).length
    expect(okCount).toBe(2)
    expect(
      rs
        .filter((r) => r.status === 409)
        .every((r) => r.body.error.code === "INSUFFICIENT_STOCK")
    ).toBe(true)
    expect(await stockOf(2)).toBe(0)
    expect(await Order.countDocuments()).toBe(2)
  })

  it("stock conflict is all-or-nothing: reports the bad lines, undoes the good ones", async () => {
    const s = await shopper()
    await add(s, ids[1]!, 2)
    await add(s, ids[2]!, 2)
    await Product.updateOne({ _id: ids[2] }, { stock: 1 })
    const res = await place(s)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK")
    expect(res.body.error.details.items).toEqual([
      expect.objectContaining({ productId: ids[2], requested: 2, availableQty: 1 }),
    ])
    expect(await stockOf(1)).toBe(50) // untouched
    expect(await Order.countDocuments()).toBe(0)
    expect((await Cart.findOne({ user: s.id }))!.items).toHaveLength(2)
  })

  it("409 PRICE_CHANGED when the total the shopper saw is stale", async () => {
    const s = await shopper()
    await add(s, ids[0]!, 1)
    await Product.updateOne({ _id: ids[0] }, { price: 900 })
    const res = await place(s, { expectedTotal: 1000 + 180 })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatchObject({
      code: "PRICE_CHANGED",
      details: { actualTotal: 900 + 162 },
    })
    expect(await Order.countDocuments()).toBe(0)
    const ok = await place(s, { expectedTotal: 900 + 162 })
    expect(ok.status).toBe(201)
  })

  it("COD is refused for remote pincodes and unserviceable ones", async () => {
    const remote = await shopper("790001")
    await add(remote, ids[1]!)
    expect((await place(remote)).body.error.code).toBe("COD_NOT_AVAILABLE")
    expect((await place(remote, { paymentMethod: "razorpay" })).body.data.status).toBe(
      "pending_payment"
    )
    const nope = await shopper("193101")
    await add(nope, ids[1]!)
    expect((await place(nope)).body.error.code).toBe("PINCODE_UNSERVICEABLE")
  })

  it("online orders start as pending_payment with stock reserved; express costs Rs 99", async () => {
    const s = await shopper()
    await add(s, ids[1]!, 1) // 300
    const res = await place(s, { paymentMethod: "razorpay", deliveryMethod: "express" })
    expect(res.body.data).toMatchObject({
      status: "pending_payment",
      pricing: { shipping: 99, tax: 54, total: 453 },
    })
    expect(await stockOf(1)).toBe(49)
  })

  it("redeems a coupon and a deal claim, and cancelling gives everything back", async () => {
    await Coupon.create({ code: "FLAT100", type: "flat", value: 100 })
    const deal = await Deal.create({
      product: ids[0],
      dealPrice: 800,
      startsAt: new Date(Date.now() - H),
      endsAt: new Date(Date.now() + H),
      stockLimit: 5,
    })
    const s = await shopper()
    await add(s, ids[0]!, 2) // 2 x 800
    await request(app)
      .post(`${A}/cart/coupon`)
      .set(auth(s.token))
      .send({ code: "FLAT100" })
    const res = await place(s)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      coupon: { code: "FLAT100", discount: 100 },
      pricing: { subtotal: 1600, discount: 100, total: 1500 + 270 },
    })
    expect(res.body.data.items[0]).toMatchObject({ unitPrice: 800, deal: true })
    expect((await Deal.findById(deal._id))!.claimed).toBe(2)
    expect((await Coupon.findOne({ code: "FLAT100" }))!.usedCount).toBe(1)
    expect(await stockOf(0)).toBe(3)
    // per-user limit (1): a second use is refused
    await add(s, ids[1]!, 2)
    const again = await request(app)
      .post(`${A}/cart/coupon`)
      .set(auth(s.token))
      .send({ code: "FLAT100" })
    expect(again.body.error.details.reason).toBe("ALREADY_USED")

    const cancel = await request(app)
      .post(`${A}/orders/${res.body.data.id}/cancel`)
      .set(auth(s.token))
      .send({ reason: "Changed my mind" })
    expect(cancel.status).toBe(200)
    expect(cancel.body.data).toMatchObject({
      status: "cancelled",
      cancelReason: "Changed my mind",
    })
    expect(await stockOf(0)).toBe(5)
    expect((await Deal.findById(deal._id))!.claimed).toBe(0)
    expect((await Coupon.findOne({ code: "FLAT100" }))!.usedCount).toBe(0)
  })

  it("a coupon that stopped applying blocks the order with its reason", async () => {
    await Coupon.create({ code: "SOON", type: "flat", value: 50 })
    const s = await shopper()
    await add(s, ids[1]!)
    await request(app).post(`${A}/cart/coupon`).set(auth(s.token)).send({ code: "SOON" })
    await Coupon.updateOne({ code: "SOON" }, { expiresAt: new Date(Date.now() - 1000) })
    const res = await place(s)
    expect(res.status).toBe(422)
    expect(res.body.error).toMatchObject({
      code: "COUPON_INVALID",
      details: { reason: "EXPIRED" },
    })
    expect(await stockOf(1)).toBe(50)
  })
})

describe("read, cancel, return, invoice", () => {
  async function placed(s: Shopper, qty = 1) {
    await add(s, ids[1]!, qty)
    return (await place(s)).body.data as { id: string; orderNumber: string }
  }

  it("lists own orders newest first with paging, filters and search; hides others'", async () => {
    const s = await shopper()
    const other = await shopper()
    const o1 = await placed(s)
    const o2 = await placed(s)
    await placed(other)
    await request(app).post(`${A}/orders/${o1.id}/cancel`).set(auth(s.token)).send({})
    const all = await request(app).get(`${A}/orders`).set(auth(s.token))
    expect(all.body.data.map((o: { id: string }) => o.id)).toEqual([o2.id, o1.id])
    expect(all.body.meta).toMatchObject({ total: 2, page: 1 })
    const cancelled = await request(app)
      .get(`${A}/orders?status=cancelled`)
      .set(auth(s.token))
    expect(cancelled.body.data).toHaveLength(1)
    const found = await request(app)
      .get(`${A}/orders?search=${o2.orderNumber.slice(-6)}`)
      .set(auth(s.token))
    expect(found.body.data).toHaveLength(1)
    expect(
      (await request(app).get(`${A}/orders/${o1.id}`).set(auth(other.token))).status
    ).toBe(404)
    expect(
      (await request(app).get(`${A}/orders?status=nope`).set(auth(s.token))).status
    ).toBe(422)
    expect((await request(app).get(`${A}/orders`)).status).toBe(401)
  })

  it("cancel works once; a second cancel and a cancel after packing are 409 INVALID_TRANSITION", async () => {
    const s = await shopper()
    const admin = await adminToken()
    const o = await placed(s, 2)
    expect(await stockOf(1)).toBe(48)
    const c1 = await request(app)
      .post(`${A}/orders/${o.id}/cancel`)
      .set(auth(s.token))
      .send({})
    expect(c1.status).toBe(200)
    expect(await stockOf(1)).toBe(50)
    const c2 = await request(app)
      .post(`${A}/orders/${o.id}/cancel`)
      .set(auth(s.token))
      .send({})
    expect(c2.status).toBe(409)
    expect(c2.body.error.code).toBe("INVALID_TRANSITION")
    expect(await stockOf(1)).toBe(50) // not restocked twice
    const o2 = await placed(s)
    await request(app)
      .post(`${A}/admin/orders/${o2.id}/status`)
      .set(auth(admin))
      .send({ status: "packed" })
    expect(
      (await request(app).post(`${A}/orders/${o2.id}/cancel`).set(auth(s.token)).send({}))
        .status
    ).toBe(409)
  })

  it("parallel cancels restock exactly once", async () => {
    const s = await shopper()
    const o = await placed(s, 3)
    const rs = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(app).post(`${A}/orders/${o.id}/cancel`).set(auth(s.token)).send({})
      )
    )
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1)
    expect(await stockOf(1)).toBe(50)
  })

  it("staff move orders along the state machine; illegal jumps are refused; customers cannot", async () => {
    const s = await shopper()
    const admin = await adminToken()
    const o = await placed(s)
    const move = (status: string, t = admin) =>
      request(app).post(`${A}/admin/orders/${o.id}/status`).set(auth(t)).send({ status })
    expect((await move("delivered")).status).toBe(409)
    expect((await move("packed", s.token)).status).toBe(403)
    for (const st of ["packed", "shipped", "out_for_delivery", "delivered"])
      expect((await move(st)).status).toBe(200)
    const d = await request(app).get(`${A}/orders/${o.id}`).set(auth(s.token))
    expect(d.body.data.status).toBe("delivered")
    expect(d.body.data.paymentStatus).toBe("paid") // COD is collected on delivery
    expect(d.body.data.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      "placed",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
    ])

    // return flow
    const r = await request(app)
      .post(`${A}/orders/${o.id}/return`)
      .set(auth(s.token))
      .send({ reason: "DAMAGED", note: "Cracked" })
    expect(r.status).toBe(200)
    expect(r.body.data).toMatchObject({
      status: "return_requested",
      returnRequest: { reason: "DAMAGED", status: "requested" },
    })
    await move("returned")
    expect(await stockOf(1)).toBe(50) // the returned unit is back on the shelf
    const refunded = await move("refunded")
    expect(refunded.body.data).toMatchObject({
      status: "refunded",
      paymentStatus: "refunded",
    })
    expect((await move("placed")).status).toBe(409)
  })

  it("returns need a delivered order inside the window", async () => {
    const s = await shopper()
    const o = await placed(s)
    const early = await request(app)
      .post(`${A}/orders/${o.id}/return`)
      .set(auth(s.token))
      .send({ reason: "DAMAGED" })
    expect(early.status).toBe(409)
    await Order.updateOne(
      { _id: o.id },
      { status: "delivered", deliveredAt: new Date(Date.now() - 10 * 86_400_000) }
    )
    const late = await request(app)
      .post(`${A}/orders/${o.id}/return`)
      .set(auth(s.token))
      .send({ reason: "DAMAGED" })
    expect(late.body.error.code).toBe("RETURN_WINDOW_CLOSED")
    expect(
      (
        await request(app)
          .post(`${A}/orders/${o.id}/return`)
          .set(auth(s.token))
          .send({ reason: "nope" })
      ).status
    ).toBe(422)
  })

  it("invoice is a PDF for confirmed orders, 409 for cancelled/pending, 404 for strangers", async () => {
    const s = await shopper()
    const other = await shopper()
    const o = await placed(s)
    const pdf = await request(app)
      .get(`${A}/orders/${o.id}/invoice`)
      .set(auth(s.token))
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = []
        res.on("data", (c: Buffer) => chunks.push(c))
        res.on("end", () => cb(null, Buffer.concat(chunks)))
      })
    expect(pdf.status).toBe(200)
    expect(pdf.headers["content-type"]).toBe("application/pdf")
    expect(pdf.headers["content-disposition"]).toContain(`invoice-${o.orderNumber}.pdf`)
    expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF")
    expect(
      (await request(app).get(`${A}/orders/${o.id}/invoice`).set(auth(other.token)))
        .status
    ).toBe(404)
    await request(app).post(`${A}/orders/${o.id}/cancel`).set(auth(s.token)).send({})
    const gone = await request(app).get(`${A}/orders/${o.id}/invoice`).set(auth(s.token))
    expect(gone.body.error.code).toBe("INVOICE_NOT_AVAILABLE")
  })
})
