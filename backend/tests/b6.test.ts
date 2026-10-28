import { createHmac } from "node:crypto"
import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Address } from "../src/modules/addresses/address.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Order } from "../src/modules/orders/order.model.js"
import {
  MOCK_WEBHOOK_SECRET,
  RazorpayGateway,
  signPayment,
  signWebhook,
} from "../src/modules/payments/gateway.js"
import { Payment, WebhookEvent } from "../src/modules/payments/payment.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
let keyN = 0
const newKey = () => `b6-key-${Date.now()}-${keyN++}-xxxx`

type Shopper = { token: string; id: string; addressId: string }
let seq = 0
async function shopper(): Promise<Shopper> {
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Pay User", email: `p${seq++}@example.com`, password: "Passw0rdOK" })
  const id = res.body.data.user.id as string
  const addr = await Address.create({
    user: id,
    fullName: "Pay User",
    phone: "9876543210",
    line1: "1 Main Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
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

let productId = ""
beforeEach(async () => {
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const p = await Product.create({
    name: "Phone",
    slug: "phone",
    sku: "PH1",
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price: 1000,
    mrp: 2000,
    stock: 10,
  })
  productId = String(p._id)
})

/** An online order waiting for payment (stock reserved). */
async function onlineOrder(s: Shopper, qty = 1) {
  await request(app).post(`${A}/cart/items`).set(auth(s.token)).send({ productId, qty })
  const res = await request(app)
    .post(`${A}/orders`)
    .set({ ...auth(s.token), "Idempotency-Key": newKey() })
    .send({ addressId: s.addressId, paymentMethod: "razorpay" })
  expect(res.status).toBe(201)
  return res.body.data as { id: string; status: string; pricing: { total: number } }
}
const startPayment = (s: Shopper, orderId: string) =>
  request(app).post(`${A}/payments/create-order`).set(auth(s.token)).send({ orderId })
const mockPay = (s: Shopper, orderId: string, outcome: string) =>
  request(app)
    .post(`${A}/payments/mock/pay`)
    .set(auth(s.token))
    .send({ orderId, outcome })
const getOrder = async (s: Shopper, id: string) =>
  (await request(app).get(`${A}/orders/${id}`).set(auth(s.token))).body.data
const stock = async () => (await Product.findById(productId))!.stock

function webhook(
  body: object,
  secret = MOCK_WEBHOOK_SECRET,
  eventId = `evt_${newKey()}`
) {
  const raw = JSON.stringify(body)
  return {
    raw,
    eventId,
    send: () =>
      request(app)
        .post(`${A}/payments/webhook`)
        .set("Content-Type", "application/json")
        .set("x-razorpay-signature", signWebhook(secret, raw))
        .set("x-razorpay-event-id", eventId)
        .send(raw),
  }
}
const capturedEvent = (providerOrderId: string, paise: number, id = "pay_x1") => ({
  event: "payment.captured",
  payload: {
    payment: { entity: { id, order_id: providerOrderId, amount: paise, method: "upi" } },
  },
})

describe("create payment order", () => {
  it("returns checkout options (paise, public key id) and reuses the provider order on retry", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const a = await startPayment(s, o.id)
    expect(a.status).toBe(200)
    expect(a.body.data).toMatchObject({
      provider: "mock",
      mock: true,
      amount: o.pricing.total * 100,
      currency: "INR",
      prefill: { name: "Pay User", contact: "9876543210" },
    })
    expect(a.body.data.providerOrderId).toMatch(/^order_/)
    const b = await startPayment(s, o.id)
    expect(b.body.data.providerOrderId).toBe(a.body.data.providerOrderId)
    expect(await Payment.countDocuments()).toBe(1)
  })

  it("rejects COD orders, other people's orders and anonymous callers", async () => {
    const s = await shopper()
    const other = await shopper()
    await request(app)
      .post(`${A}/cart/items`)
      .set(auth(s.token))
      .send({ productId, qty: 1 })
    const cod = await request(app)
      .post(`${A}/orders`)
      .set({ ...auth(s.token), "Idempotency-Key": newKey() })
      .send({ addressId: s.addressId, paymentMethod: "cod" })
    expect((await startPayment(s, cod.body.data.id)).body.error.code).toBe(
      "NOT_ONLINE_PAYMENT"
    )
    const o = await onlineOrder(other)
    expect((await startPayment(s, o.id)).status).toBe(404)
    expect(
      (await request(app).post(`${A}/payments/create-order`).send({ orderId: o.id }))
        .status
    ).toBe(401)
    expect((await startPayment(s, "nope")).status).toBe(422)
  })
})

describe("verify (the browser handler) and webhooks", () => {
  it("success: signature verified -> order placed, payment paid, listed in history", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    await startPayment(s, o.id)
    const paid = await mockPay(s, o.id, "success")
    const verified = await request(app)
      .post(`${A}/payments/verify`)
      .set(auth(s.token))
      .send({ orderId: o.id, ...paid.body.data.handler })
    expect(verified.status).toBe(200)
    expect(verified.body.data).toMatchObject({ status: "placed", paymentStatus: "paid" })
    const order = await getOrder(s, o.id)
    expect(order.statusHistory.map((h: { status: string }) => h.status)).toEqual([
      "pending_payment",
      "placed",
    ])
    const list = await request(app).get(`${A}/payments`).set(auth(s.token))
    expect(list.body.data[0]).toMatchObject({
      status: "paid",
      method: "card",
      amount: o.pricing.total,
    })
    expect(list.body.meta.total).toBe(1)
  })

  it("a forged signature is rejected and the order stays pending", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const start = await startPayment(s, o.id)
    const res = await request(app)
      .post(`${A}/payments/verify`)
      .set(auth(s.token))
      .send({
        orderId: o.id,
        razorpay_order_id: start.body.data.providerOrderId,
        razorpay_payment_id: "pay_fake1",
        razorpay_signature: "f".repeat(64),
      })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("SIGNATURE_MISMATCH")
    expect((await getOrder(s, o.id)).status).toBe("pending_payment")
  })

  it("tab closed right after paying: only the webhook arrives and still settles the order", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    await startPayment(s, o.id)
    const r = await mockPay(s, o.id, "success_no_callback")
    expect(r.body.data.handler).toBeNull()
    expect(await getOrder(s, o.id)).toMatchObject({
      status: "placed",
      paymentStatus: "paid",
    })
  })

  it("webhook: bad signature 400, duplicate delivery is a no-op, wrong amount is ignored", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const start = await startPayment(s, o.id)
    const pid = start.body.data.providerOrderId as string

    const bad = webhook(capturedEvent(pid, o.pricing.total * 100), "wrong-secret")
    expect((await bad.send()).status).toBe(400)
    expect((await getOrder(s, o.id)).status).toBe("pending_payment")

    const wrongAmount = webhook(capturedEvent(pid, 100))
    expect((await wrongAmount.send()).status).toBe(200)
    expect((await getOrder(s, o.id)).status).toBe("pending_payment")

    const good = webhook(capturedEvent(pid, o.pricing.total * 100))
    const first = await good.send()
    const again = await good.send()
    expect(first.body.data.duplicate).toBe(false)
    expect(again.body.data.duplicate).toBe(true)
    const order = await getOrder(s, o.id)
    expect(order.status).toBe("placed")
    expect(order.statusHistory).toHaveLength(2)
    expect(await WebhookEvent.countDocuments({ eventId: good.eventId })).toBe(1)
  })

  it("verify and webhook racing each other settle exactly once", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const start = await startPayment(s, o.id)
    const pid = start.body.data.providerOrderId as string
    const payId = "pay_race1"
    const verify = request(app)
      .post(`${A}/payments/verify`)
      .set(auth(s.token))
      .send({
        orderId: o.id,
        razorpay_order_id: pid,
        razorpay_payment_id: payId,
        razorpay_signature: signPayment("mock_key_secret_not_a_real_secret", pid, payId),
      })
    const hook = webhook(capturedEvent(pid, o.pricing.total * 100, payId)).send()
    await Promise.all([verify, hook])
    const order = await Order.findById(o.id)
    expect(order!.statusHistory.filter((h) => h.status === "placed")).toHaveLength(1)
    expect(order!.payment?.status).toBe("paid")
  })

  it("failure shows the reason, keeps the order retryable on the SAME provider order, then succeeds", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const first = await startPayment(s, o.id)
    await mockPay(s, o.id, "failure")
    const failed = (
      await request(app).get(`${A}/payments?orderId=${o.id}`).set(auth(s.token))
    ).body.data[0]
    expect(failed).toMatchObject({ status: "failed", attempts: 1 })
    expect(failed.failureReason).toMatch(/declined/)
    expect(await getOrder(s, o.id)).toMatchObject({
      status: "pending_payment",
      paymentStatus: "failed",
    })

    const retry = await startPayment(s, o.id)
    expect(retry.body.data.providerOrderId).toBe(first.body.data.providerOrderId)
    await mockPay(s, o.id, "success_no_callback")
    expect(await getOrder(s, o.id)).toMatchObject({
      status: "placed",
      paymentStatus: "paid",
    })
    expect(await Payment.countDocuments()).toBe(1)
  })

  it("a late failure event never un-pays a paid order", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const start = await startPayment(s, o.id)
    const pid = start.body.data.providerOrderId as string
    await webhook(capturedEvent(pid, o.pricing.total * 100)).send()
    await webhook({
      event: "payment.failed",
      payload: {
        payment: { entity: { id: "pay_late", order_id: pid, error_description: "x" } },
      },
    }).send()
    expect(await getOrder(s, o.id)).toMatchObject({
      status: "placed",
      paymentStatus: "paid",
    })
  })
})

describe("refunds", () => {
  async function paidOrder(s: Shopper, qty = 1) {
    const o = await onlineOrder(s, qty)
    await startPayment(s, o.id)
    await mockPay(s, o.id, "success_no_callback")
    return o
  }

  it("cancelling a paid order refunds it through the gateway and restocks", async () => {
    const s = await shopper()
    const o = await paidOrder(s)
    expect(await stock()).toBe(9)
    const res = await request(app)
      .post(`${A}/orders/${o.id}/cancel`)
      .set(auth(s.token))
      .send({})
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      status: "cancelled",
      paymentStatus: "refunded",
    })
    expect(await stock()).toBe(10)
    const p = (await request(app).get(`${A}/payments`).set(auth(s.token))).body.data[0]
    expect(p.refundedAmount).toBe(o.pricing.total)
    expect(p.refunds[0]).toMatchObject({ status: "processed", amount: o.pricing.total })
  })

  it("cancelling an unpaid order closes the payment; a late capture is refunded automatically", async () => {
    const s = await shopper()
    const o = await onlineOrder(s)
    const start = await startPayment(s, o.id)
    await request(app).post(`${A}/orders/${o.id}/cancel`).set(auth(s.token)).send({})
    expect((await Payment.findOne())!.status).toBe("cancelled")
    // startPayment on a cancelled order is refused
    expect((await startPayment(s, o.id)).body.error.code).toBe("ORDER_NOT_PAYABLE")
    // ...but the shopper still had the modal open and paid
    await webhook(
      capturedEvent(start.body.data.providerOrderId, o.pricing.total * 100)
    ).send()
    const order = await getOrder(s, o.id)
    expect(order).toMatchObject({ status: "cancelled", paymentStatus: "refunded" })
    expect((await Payment.findOne())!.refundedAmount).toBe(o.pricing.total)
  })

  it("admin: partial refunds add up, over-refunding is 409, customers get 403", async () => {
    const s = await shopper()
    const o = await paidOrder(s)
    const admin = await adminToken()
    const payment = await Payment.findOne()
    const url = `${A}/admin/payments/${payment!._id}/refund`
    expect((await request(app).post(url).set(auth(s.token)).send({})).status).toBe(403)
    const part = await request(app)
      .post(url)
      .set(auth(admin))
      .send({ amount: 100, reason: "Goodwill" })
    expect(part.status).toBe(200)
    expect(part.body.data.refundedAmount).toBe(100)
    expect((await getOrder(s, o.id)).paymentStatus).toBe("partially_refunded")
    const tooMuch = await request(app)
      .post(url)
      .set(auth(admin))
      .send({ amount: o.pricing.total })
    expect(tooMuch.status).toBe(409)
    expect(tooMuch.body.error.code).toBe("REFUND_EXCEEDS_PAYMENT")
    const rest = await request(app).post(url).set(auth(admin)).send({})
    expect(rest.body.data.refundedAmount).toBe(o.pricing.total)
    expect((await getOrder(s, o.id)).paymentStatus).toBe("refunded")
    const all = await request(app).get(`${A}/admin/payments`).set(auth(admin))
    expect(all.body.meta.total).toBe(1)
  })
})

describe("gateway adapters", () => {
  it("HMAC helpers match Razorpay's documented construction", () => {
    const expected = createHmac("sha256", "secret").update("order_1|pay_1").digest("hex")
    expect(signPayment("secret", "order_1", "pay_1")).toBe(expected)
    const g = new RazorpayGateway("rzp_test_x", "secret", "whsec")
    expect(
      g.verifyPaymentSignature({
        orderId: "order_1",
        paymentId: "pay_1",
        signature: expected,
      })
    ).toBe(true)
    expect(
      g.verifyPaymentSignature({
        orderId: "order_1",
        paymentId: "pay_2",
        signature: expected,
      })
    ).toBe(false)
    expect(g.verifyWebhookSignature("{}", signWebhook("whsec", "{}"))).toBe(true)
    expect(g.verifyWebhookSignature("{}", "short")).toBe(false)
  })

  it("RazorpayGateway sends paise with basic auth and maps provider errors to 502", async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return url.endsWith("/orders")
        ? new Response(JSON.stringify({ id: "order_real1" }), { status: 200 })
        : new Response(JSON.stringify({ error: { description: "Nope", code: "BAD" } }), {
            status: 400,
          })
    }) as unknown as typeof fetch
    const g = new RazorpayGateway("rzp_test_x", "secret", "whsec", fake)
    expect(await g.createOrder({ amountPaise: 118000, receipt: "SS-1" })).toEqual({
      id: "order_real1",
    })
    expect(calls[0]!.url).toBe("https://api.razorpay.com/v1/orders")
    expect(JSON.parse(calls[0]!.init.body as string)).toMatchObject({
      amount: 118000,
      currency: "INR",
    })
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("rzp_test_x:secret").toString("base64")}`
    )
    await expect(
      g.refund({ paymentId: "pay_1", amountPaise: 100 })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "PAYMENT_PROVIDER_ERROR",
    })
  })
})
