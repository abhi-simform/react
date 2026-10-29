import request from "supertest"
import { Types } from "mongoose"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order, type OrderStatus } from "../src/modules/orders/order.model.js"
import { Payment } from "../src/modules/payments/payment.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { Deal } from "../src/modules/deals/deal.model.js"
import { Question, Answer } from "../src/modules/reviews/qa.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
type Acc = { token: string; id: string }

async function account(
  email: string,
  role: "customer" | "seller" | "admin",
  name = "Test User"
) {
  const reg = await request(app)
    .post(`${A}/auth/register`)
    .send({ name, email, password: "Passw0rdOK" })
  const id = reg.body.data.user.id as string
  if (role === "customer") return { token: reg.body.data.accessToken as string, id }
  await User.updateOne({ _id: id }, { role })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email, password: "Passw0rdOK" })
  return { token: res.body.data.accessToken as string, id }
}

let admin: Acc, sellerA: Acc, sellerB: Acc, customer: Acc
let pA: InstanceType<typeof Product>, pB: InstanceType<typeof Product>

const mkProduct = (
  name: string,
  seller: string,
  category: Types.ObjectId,
  price: number
) =>
  Product.create({
    name,
    slug: name.toLowerCase().replace(/\s/g, "-"),
    brand: "Nova",
    category,
    categoryPath: [category],
    price,
    mrp: price + 20,
    sku: name.toUpperCase().replace(/\s/g, "-"),
    stock: 20,
    seller,
  })

async function mkOrder(
  status: OrderStatus,
  lines: { p: InstanceType<typeof Product>; qty: number }[],
  over: Record<string, unknown> = {}
) {
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
  return Order.create({
    orderNumber: `T-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
    user: customer.id,
    items,
    status,
    statusHistory: [{ status, at: new Date(), note: "seed" }],
    pricing: { subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal },
    payment: { method: "cod", status: "pending" },
    ...over,
  })
}

beforeEach(async () => {
  const cat = await Category.create({ name: "Phones", slug: "phones" })
  admin = await account("admin@example.com", "admin")
  sellerA = await account("sa@example.com", "seller")
  sellerB = await account("sb@example.com", "seller")
  customer = await account("riya@example.com", "customer", "Riya Sharma")
  pA = await mkProduct("Alpha Phone", sellerA.id, cat._id, 500)
  pB = await mkProduct("Beta Cover", sellerB.id, cat._id, 100)
})

describe("admin orders: list, filters, detail, export", () => {
  it("lists with the customer, filters by status/payment/search/date and sorts by total", async () => {
    await mkOrder("placed", [{ p: pA, qty: 1 }])
    await mkOrder("delivered", [{ p: pB, qty: 2 }], {
      payment: { method: "razorpay", status: "paid" },
    })
    const all = await request(app).get(`${A}/admin/orders`).set(auth(admin.token))
    expect(all.status).toBe(200)
    expect(all.body.meta.total).toBe(2)
    expect(all.body.data[0].customer).toMatchObject({
      name: "Riya Sharma",
      email: "riya@example.com",
    })
    const byStatus = await request(app)
      .get(`${A}/admin/orders?status=delivered`)
      .set(auth(admin.token))
    expect(byStatus.body.data).toHaveLength(1)
    const byPay = await request(app)
      .get(`${A}/admin/orders?paymentMethod=razorpay`)
      .set(auth(admin.token))
    expect(byPay.body.data).toHaveLength(1)
    const bySearch = await request(app)
      .get(`${A}/admin/orders?search=riya`)
      .set(auth(admin.token))
    expect(bySearch.body.data).toHaveLength(2) // matched through the customer's name
    const none = await request(app)
      .get(`${A}/admin/orders?search=nobody`)
      .set(auth(admin.token))
    expect(none.body.data).toHaveLength(0)
    const sorted = await request(app)
      .get(`${A}/admin/orders?sort=total&order=asc`)
      .set(auth(admin.token))
    expect(
      sorted.body.data.map((o: { pricing: { total: number } }) => o.pricing.total)
    ).toEqual([200, 500])
    const future = await request(app)
      .get(`${A}/admin/orders?from=2999-01-01`)
      .set(auth(admin.token))
    expect(future.body.data).toHaveLength(0)
    const bad = await request(app)
      .get(`${A}/admin/orders?sort=bogus`)
      .set(auth(admin.token))
    expect(bad.status).toBe(422)
  })

  it("detail includes customer, payment with the refundable amount and staff notes; customers get 403", async () => {
    const o = await mkOrder("delivered", [{ p: pA, qty: 1 }], {
      payment: { method: "razorpay", status: "paid" },
    })
    await Payment.create({
      order: o._id,
      user: customer.id,
      orderNumber: o.orderNumber,
      provider: "mock",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      amount: 500,
      status: "paid",
      paidAt: new Date(),
    })
    const res = await request(app)
      .get(`${A}/admin/orders/${o._id}`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.data.payment).toMatchObject({
      status: "paid",
      amount: 500,
      refundable: 500,
    })
    expect(res.body.data.customer.email).toBe("riya@example.com")
    expect(
      (await request(app).get(`${A}/admin/orders/${o._id}`).set(auth(customer.token)))
        .status
    ).toBe(403)
    expect(
      (
        await request(app)
          .get(`${A}/admin/orders/${new Types.ObjectId()}`)
          .set(auth(admin.token))
      ).status
    ).toBe(404)
  })

  it("exports the filtered view as CSV and neutralises formula cells", async () => {
    await User.updateOne({ _id: customer.id }, { name: "=HYPERLINK(1)" })
    await mkOrder("placed", [{ p: pA, qty: 1 }])
    const res = await request(app)
      .get(`${A}/admin/orders/export.csv?status=placed`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toContain("text/csv")
    const lines = res.text.split("\n")
    expect(lines[0]).toContain("orderNumber,createdAt,status")
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("'=HYPERLINK(1)")
  })
})

describe("admin order actions", () => {
  it("shipping needs carrier + tracking (422 with a nested path) and the customer then sees them", async () => {
    const o = await mkOrder("packed", [{ p: pA, qty: 1 }])
    const bad = await request(app)
      .post(`${A}/admin/orders/${o._id}/status`)
      .set(auth(admin.token))
      .send({ status: "shipped" })
    expect(bad.status).toBe(422)
    expect(bad.body.error.details[0].path).toBe("shipment.carrier")
    const ok = await request(app)
      .post(`${A}/admin/orders/${o._id}/status`)
      .set(auth(admin.token))
      .send({
        status: "shipped",
        shipment: { carrier: "Delhivery", trackingId: "DLV123456" },
      })
    expect(ok.status).toBe(200)
    expect(ok.body.data.shipment).toMatchObject({
      carrier: "Delhivery",
      trackingId: "DLV123456",
    })
    const mine = await request(app).get(`${A}/orders/${o._id}`).set(auth(customer.token))
    expect(mine.body.data.shipment.trackingId).toBe("DLV123456")
  })

  it("illegal transitions are 409 INVALID_TRANSITION with the allowed list; cancelling needs a reason", async () => {
    const o = await mkOrder("packed", [{ p: pA, qty: 1 }])
    const illegal = await request(app)
      .post(`${A}/admin/orders/${o._id}/status`)
      .set(auth(admin.token))
      .send({ status: "delivered" })
    expect(illegal.status).toBe(409)
    expect(illegal.body.error.code).toBe("INVALID_TRANSITION")
    expect(illegal.body.error.details.allowed).toEqual(["shipped"])
    const placed = await mkOrder("placed", [{ p: pA, qty: 1 }])
    const noReason = await request(app)
      .post(`${A}/admin/orders/${placed._id}/status`)
      .set(auth(admin.token))
      .send({ status: "cancelled" })
    expect(noReason.status).toBe(422)
    expect(noReason.body.error.details[0].path).toBe("note")
    const cancelled = await request(app)
      .post(`${A}/admin/orders/${placed._id}/status`)
      .set(auth(admin.token))
      .send({ status: "cancelled", note: "Out of stock" })
    expect(cancelled.body.data).toMatchObject({
      status: "cancelled",
      cancelReason: "Out of stock",
    })
  })

  it("staff notes are internal: visible to admin, absent from the customer's order; status moves are audited with a diff", async () => {
    const o = await mkOrder("placed", [{ p: pA, qty: 1 }])
    const note = await request(app)
      .post(`${A}/admin/orders/${o._id}/notes`)
      .set(auth(admin.token))
      .send({ text: "Call before delivery" })
    expect(note.status).toBe(201)
    expect(note.body.data.staffNotes[0]).toMatchObject({ text: "Call before delivery" })
    const mine = await request(app).get(`${A}/orders/${o._id}`).set(auth(customer.token))
    expect(JSON.stringify(mine.body)).not.toContain("Call before delivery")
    await request(app)
      .post(`${A}/admin/orders/${o._id}/status`)
      .set(auth(admin.token))
      .send({ status: "packed" })
    await new Promise((r) => setTimeout(r, 100))
    const log = await request(app)
      .get(`${A}/admin/audit-logs?entity=orders&action=POST /admin/orders/:id/status`)
      .set(auth(admin.token))
    expect(log.body.data[0].changes.status).toEqual({ before: "placed", after: "packed" })
  })

  it("the returns queue carries the customer", async () => {
    await mkOrder("return_requested", [{ p: pA, qty: 1 }], {
      returnRequest: { status: "requested", reason: "DAMAGED", requestedAt: new Date() },
    })
    const res = await request(app)
      .get(`${A}/admin/returns?status=requested`)
      .set(auth(admin.token))
    expect(res.body.data[0].customer.name).toBe("Riya Sharma")
  })
})

describe("refund idempotency (admin)", () => {
  async function paid() {
    const o = await mkOrder("delivered", [{ p: pA, qty: 2 }], {
      payment: { method: "razorpay", status: "paid" },
    })
    const p = await Payment.create({
      order: o._id,
      user: customer.id,
      orderNumber: o.orderNumber,
      provider: "mock",
      providerOrderId: `order_${Math.random()}`,
      providerPaymentId: "pay_1",
      amount: 1000,
      status: "paid",
      paidAt: new Date(),
    })
    return p
  }
  const refund = (id: unknown, key: string | undefined, body: object) =>
    request(app)
      .post(`${A}/admin/payments/${id}/refund`)
      .set({ ...auth(admin.token), ...(key ? { "Idempotency-Key": key } : {}) })
      .send(body)

  it("a retry with the same key replays the first refund instead of refunding twice", async () => {
    const p = await paid()
    const first = await refund(p._id, "refund-key-0001", {
      amount: 300,
      reason: "Damaged",
    })
    expect(first.status).toBe(200)
    expect(first.body.data.refundedAmount).toBe(300)
    const again = await refund(p._id, "refund-key-0001", {
      amount: 300,
      reason: "Damaged",
    })
    expect(again.status).toBe(200)
    expect(again.headers["idempotent-replayed"]).toBe("true")
    expect(again.body.data.refunds).toHaveLength(1)
    expect((await Payment.findById(p._id))!.refundedAmount).toBe(300)
  })

  it("the same key with another amount is 422; a malformed key is 400; a new key refunds again", async () => {
    const p = await paid()
    await refund(p._id, "refund-key-0001", { amount: 300 })
    const clash = await refund(p._id, "refund-key-0001", { amount: 400 })
    expect(clash.status).toBe(422)
    expect(clash.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED")
    const malformed = await refund(p._id, "x", { amount: 100 })
    expect(malformed.status).toBe(400)
    const second = await refund(p._id, "refund-key-0002", { amount: 200 })
    expect(second.body.data.refundedAmount).toBe(500)
  })

  it("two simultaneous clicks with one key refund exactly once", async () => {
    const p = await paid()
    const [a, b] = await Promise.all([
      refund(p._id, "refund-key-race1", { amount: 250 }),
      refund(p._id, "refund-key-race1", { amount: 250 }),
    ])
    expect([a.status, b.status].filter((s) => s === 200).length).toBeGreaterThanOrEqual(1)
    expect([a.status, b.status].every((s) => s === 200 || s === 409)).toBe(true)
    expect(
      (await Payment.findById(p._id))!.refunds.filter((r) => r.status !== "failed")
    ).toHaveLength(1)
  })

  it("over-refunding is 409 and a replay writes no second audit row", async () => {
    const p = await paid()
    const over = await refund(p._id, "refund-key-over1", { amount: 5000 })
    expect(over.status).toBe(409)
    expect(over.body.error.code).toBe("REFUND_EXCEEDS_PAYMENT")
    await refund(p._id, "refund-key-0009", { amount: 100 })
    await refund(p._id, "refund-key-0009", { amount: 100 })
    await new Promise((r) => setTimeout(r, 100))
    const log = await request(app)
      .get(`${A}/admin/audit-logs?entity=payments`)
      .set(auth(admin.token))
    expect(log.body.data).toHaveLength(1)
    expect(log.body.data[0].changes.refundedAmount).toEqual({ before: 0, after: 100 })
  })
})

describe("seller orders: own lines only", () => {
  it("a seller sees orders containing their products, only their lines, no pricing or customer", async () => {
    const mixed = await mkOrder("placed", [
      { p: pA, qty: 1 },
      { p: pB, qty: 2 },
    ])
    await mkOrder("placed", [{ p: pB, qty: 1 }]) // not sellerA's at all
    await mkOrder("pending_payment", [{ p: pA, qty: 1 }]) // unpaid: hidden
    const list = await request(app).get(`${A}/seller/orders`).set(auth(sellerA.token))
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(1)
    const o = list.body.data[0]
    expect(o.items.map((i: { title: string }) => i.title)).toEqual(["Alpha Phone"])
    expect(o.yourTotal).toBe(500)
    expect(o).not.toHaveProperty("pricing")
    expect(o).not.toHaveProperty("userId")
    expect(JSON.stringify(o)).not.toContain("Beta Cover")
    const one = await request(app)
      .get(`${A}/seller/orders/${mixed._id}`)
      .set(auth(sellerA.token))
    expect(one.status).toBe(200)
    expect(one.body.data.units).toBe(1)
  })

  it("another seller's order is 404, customers are 403, anonymous is 401", async () => {
    const o = await mkOrder("placed", [{ p: pB, qty: 1 }])
    expect(
      (await request(app).get(`${A}/seller/orders/${o._id}`).set(auth(sellerA.token)))
        .status
    ).toBe(404)
    expect(
      (await request(app).get(`${A}/seller/orders`).set(auth(customer.token))).status
    ).toBe(403)
    expect((await request(app).get(`${A}/seller/orders`)).status).toBe(401)
  })
})

describe("deals overlap and Q&A moderation list", () => {
  const dealBody = (startsAt: string, endsAt: string, over = {}) => ({
    productId: String(pA._id),
    dealPrice: 400,
    startsAt,
    endsAt,
    stockLimit: 5,
    ...over,
  })
  const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

  it("an overlapping active deal on the same product is 409 DEAL_OVERLAP on startsAt", async () => {
    const first = await request(app)
      .post(`${A}/admin/deals`)
      .set(auth(admin.token))
      .send(dealBody(day(1), day(3)))
    expect(first.status).toBe(201)
    const clash = await request(app)
      .post(`${A}/admin/deals`)
      .set(auth(admin.token))
      .send(dealBody(day(2), day(4)))
    expect(clash.status).toBe(409)
    expect(clash.body.error.code).toBe("DEAL_OVERLAP")
    expect(clash.body.error.details[0].path).toBe("startsAt")
    const adjacent = await request(app)
      .post(`${A}/admin/deals`)
      .set(auth(admin.token))
      .send(dealBody(day(3), day(5)))
    expect(adjacent.status).toBe(201) // touching windows do not overlap
    const inactive = await request(app)
      .post(`${A}/admin/deals`)
      .set(auth(admin.token))
      .send(dealBody(day(2), day(4), { isActive: false }))
    expect(inactive.status).toBe(201)
    // editing the second deal to start earlier collides with the first
    const move = await request(app)
      .patch(`${A}/admin/deals/${adjacent.body.data._id}`)
      .set(auth(admin.token))
      .send({ startsAt: day(2) })
    expect(move.status).toBe(409)
    // switching the inactive one on would collide too
    const on = await request(app)
      .patch(`${A}/admin/deals/${inactive.body.data._id}`)
      .set(auth(admin.token))
      .send({ isActive: true })
    expect(on.status).toBe(409)
    const list = await request(app).get(`${A}/admin/deals`).set(auth(admin.token))
    expect(list.body.data[0].productInfo.name).toBe("Alpha Phone")
    expect(await Deal.countDocuments()).toBe(3)
  })

  it("the Q&A moderation list shows the product, every answer and can filter unanswered", async () => {
    const q = await Question.create({
      product: pA._id,
      user: customer.id,
      userName: "R*",
      text: "Does it support 5G?",
    })
    await Question.create({
      product: pB._id,
      user: customer.id,
      userName: "R*",
      text: "Is it waterproof, really?",
      answerCount: 1,
    })
    await Answer.create({
      question: q._id,
      product: pA._id,
      user: sellerA.id,
      userName: "Sam",
      text: "Yes it does",
      status: "hidden",
    })
    const all = await request(app).get(`${A}/admin/questions`).set(auth(admin.token))
    expect(all.body.data).toHaveLength(2)
    const mine = all.body.data.find((x: { id: string }) => x.id === String(q._id))
    expect(mine.product.name).toBe("Alpha Phone")
    expect(mine.answers).toMatchObject([{ text: "Yes it does", status: "hidden" }])
    const un = await request(app)
      .get(`${A}/admin/questions?unanswered=true`)
      .set(auth(admin.token))
    expect(un.body.data).toHaveLength(1)
  })
})
