import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Address } from "../src/modules/addresses/address.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import { Payment } from "../src/modules/payments/payment.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
let keyN = 0
const newKey = () => `ret-key-${Date.now()}-${keyN++}-xxxx`

type Shopper = { token: string; id: string; addressId: string }
let seq = 0
async function shopper(): Promise<Shopper> {
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Ret User", email: `ret${seq++}@example.com`, password: "Passw0rdOK" })
  const id = res.body.data.user.id as string
  const addr = await Address.create({
    user: id,
    fullName: "Ret User",
    phone: "9876543210",
    line1: "1 Main Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    isDefault: true,
  })
  return { token: res.body.data.accessToken, id, addressId: String(addr._id) }
}
let adminTok = ""
let ids: string[] = []
beforeEach(async () => {
  const email = `admin${seq++}@example.com`
  await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Admin", email, password: "Passw0rdOK" })
  await User.updateOne({ email }, { role: "admin" })
  adminTok = (
    await request(app).post(`${A}/auth/login`).send({ email, password: "Passw0rdOK" })
  ).body.data.accessToken
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const mk = (n: string, price: number) => ({
    name: n,
    slug: n.toLowerCase(),
    sku: n,
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price,
    mrp: price * 2,
    stock: 20,
  })
  ids = (await Product.create([mk("Phone", 1000), mk("Novel", 300)])).map((d) =>
    String(d._id)
  )
})

const admin = (id: string, status: string) =>
  request(app).post(`${A}/admin/orders/${id}/status`).set(auth(adminTok)).send({ status })

/** Place an order for 2 phones + 1 novel and deliver it. */
async function deliveredOrder(s: Shopper, paymentMethod: "cod" | "razorpay" = "cod") {
  await request(app)
    .post(`${A}/cart/items`)
    .set(auth(s.token))
    .send({ productId: ids[0], qty: 2 })
  await request(app)
    .post(`${A}/cart/items`)
    .set(auth(s.token))
    .send({ productId: ids[1], qty: 1 })
  const placed = await request(app)
    .post(`${A}/orders`)
    .set({ ...auth(s.token), "Idempotency-Key": newKey() })
    .send({ addressId: s.addressId, paymentMethod })
  const id = placed.body.data.id as string
  if (paymentMethod === "razorpay") {
    await request(app)
      .post(`${A}/payments/create-order`)
      .set(auth(s.token))
      .send({ orderId: id })
    await request(app)
      .post(`${A}/payments/mock/pay`)
      .set(auth(s.token))
      .send({ orderId: id, outcome: "success_no_callback" })
  }
  for (const st of ["packed", "shipped", "out_for_delivery", "delivered"])
    await admin(id, st)
  return placed.body.data as {
    id: string
    pricing: { subtotal: number; tax: number; total: number; shipping: number }
  }
}
const ret = (s: Shopper, id: string, body: object) =>
  request(app).post(`${A}/orders/${id}/return`).set(auth(s.token)).send(body)

describe("return requests", () => {
  it("full return by default: computes the refund, keeps a history, shows pickup address", async () => {
    const s = await shopper()
    const o = await deliveredOrder(s)
    const res = await ret(s, o.id, { reason: "DAMAGED", note: "Cracked screen" })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe("return_requested")
    const r = res.body.data.returnRequest
    expect(r).toMatchObject({
      status: "requested",
      reason: "DAMAGED",
      refundAmount: o.pricing.total - o.pricing.shipping,
    })
    expect(r.items).toHaveLength(2)
    expect(r.pickupAddress.pincode).toBe("560001")
    expect(r.history.map((h: { status: string }) => h.status)).toEqual(["requested"])
  })

  it("partial return: validates quantities against what was bought, refunds only that share, restocks only that", async () => {
    const s = await shopper()
    const o = await deliveredOrder(s)
    const tooMany = await ret(s, o.id, {
      reason: "OTHER",
      items: [{ productId: ids[0], qty: 3 }],
    })
    expect(tooMany.status).toBe(422)
    expect(tooMany.body.error.details[0]).toMatchObject({ path: "items.0.qty" })
    expect(
      (
        await ret(s, o.id, {
          reason: "OTHER",
          items: [{ productId: "a".repeat(24), qty: 1 }],
        })
      ).status
    ).toBe(422)
    expect(
      (
        await ret(s, o.id, {
          reason: "OTHER",
          items: [
            { productId: ids[0], qty: 1 },
            { productId: ids[0], qty: 1 },
          ],
        })
      ).status
    ).toBe(422)

    const before = (await Product.findById(ids[0]))!.stock
    const res = await ret(s, o.id, {
      reason: "NO_LONGER_NEEDED",
      items: [{ productId: ids[0], qty: 1 }],
    })
    expect(res.status).toBe(200)
    // 1 of 2 phones: share of (subtotal + tax) = 1000/2300 * (2300 + 414)
    expect(res.body.data.returnRequest.refundAmount).toBe(
      Math.round((1000 / 2300) * (o.pricing.subtotal + o.pricing.tax))
    )
    await request(app)
      .post(`${A}/admin/returns/${o.id}/decision`)
      .set(auth(adminTok))
      .send({ decision: "approve" })
    expect((await Product.findById(ids[0]))!.stock).toBe(before + 1)
    expect((await Product.findById(ids[1]))!.stock).toBe(19) // the novel was not returned: no restock
  })

  it("rejects photos that are not your own uploads, other states, the closed window and strangers", async () => {
    const s = await shopper()
    const other = await shopper()
    const o = await deliveredOrder(s)
    const foreign = await ret(s, o.id, {
      reason: "DAMAGED",
      photos: ["https://evil.example/a.jpg"],
    })
    expect(foreign.status).toBe(422)
    expect(foreign.body.error.details[0].path).toBe("photos.0")
    expect((await ret(other, o.id, { reason: "DAMAGED" })).status).toBe(404)
    expect((await ret(s, o.id, {})).status).toBe(422)
    const uuid = "123e4567-e89b-12d3-a456-426614174000"
    const okPhoto = `http://localhost:4000/uploads/${s.id}-${uuid}.png`
    const good = await ret(s, o.id, { reason: "DAMAGED", photos: [okPhoto] })
    expect(good.body.data.returnRequest.photos).toEqual([okPhoto])
    // already return_requested: a second request is an invalid transition
    expect((await ret(s, o.id, { reason: "DAMAGED" })).body.error.code).toBe(
      "INVALID_TRANSITION"
    )

    const o2 = await deliveredOrder(s)
    await Order.updateOne(
      { _id: o2.id },
      { deliveredAt: new Date(Date.now() - 8 * 86_400_000) }
    )
    expect((await ret(s, o2.id, { reason: "DAMAGED" })).body.error.code).toBe(
      "RETURN_WINDOW_CLOSED"
    )
  })

  it("admin queue: approve then refund; rejection puts the order back to delivered; customers get 403", async () => {
    const s = await shopper()
    const o = await deliveredOrder(s)
    await ret(s, o.id, { reason: "WRONG_ITEM" })
    expect((await request(app).get(`${A}/admin/returns`).set(auth(s.token))).status).toBe(
      403
    )
    const q = await request(app)
      .get(`${A}/admin/returns?status=requested`)
      .set(auth(adminTok))
    expect(q.body.meta.total).toBe(1)

    const approved = await request(app)
      .post(`${A}/admin/returns/${o.id}/decision`)
      .set(auth(adminTok))
      .send({ decision: "approve", note: "Pickup booked" })
    expect(approved.body.data.status).toBe("returned")
    expect(approved.body.data.returnRequest.status).toBe("approved")
    const refunded = await request(app)
      .post(`${A}/admin/returns/${o.id}/refund`)
      .set(auth(adminTok))
      .send({})
    expect(refunded.body.data).toMatchObject({
      status: "refunded",
      paymentStatus: "refunded",
    })
    expect(
      refunded.body.data.returnRequest.history.map((h: { status: string }) => h.status)
    ).toEqual(["requested", "approved", "refunded"])
    // refund before approval is an invalid transition
    const o2 = await deliveredOrder(s)
    await ret(s, o2.id, { reason: "OTHER" })
    expect(
      (
        await request(app)
          .post(`${A}/admin/returns/${o2.id}/refund`)
          .set(auth(adminTok))
          .send({})
      ).status
    ).toBe(409)
    const rejected = await request(app)
      .post(`${A}/admin/returns/${o2.id}/decision`)
      .set(auth(adminTok))
      .send({ decision: "reject", note: "Used item" })
    expect(rejected.body.data).toMatchObject({
      status: "delivered",
      returnRequest: { status: "rejected" },
    })
  })

  it("online-paid order: the refund goes back through the gateway for the returned share", async () => {
    const s = await shopper()
    const o = await deliveredOrder(s, "razorpay")
    const r = await ret(s, o.id, {
      reason: "DAMAGED",
      items: [{ productId: ids[1], qty: 1 }],
    })
    const due = r.body.data.returnRequest.refundAmount as number
    await request(app)
      .post(`${A}/admin/returns/${o.id}/decision`)
      .set(auth(adminTok))
      .send({ decision: "approve" })
    const refunded = await request(app)
      .post(`${A}/admin/returns/${o.id}/refund`)
      .set(auth(adminTok))
      .send({})
    expect(refunded.body.data.status).toBe("refunded")
    expect(refunded.body.data.paymentStatus).toBe("partially_refunded")
    const p = await Payment.findOne({ order: o.id })
    expect(p!.refundedAmount).toBe(due)
    expect(p!.refunds[0]).toMatchObject({ status: "processed", amount: due })
  })
})
