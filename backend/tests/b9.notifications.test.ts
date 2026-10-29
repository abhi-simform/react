import type { AddressInfo } from "node:net"
import { createServer, type Server } from "node:http"
import jwt from "jsonwebtoken"
import { io as connect, type Socket } from "socket.io-client"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "../src/app.js"
import { Address } from "../src/modules/addresses/address.model.js"
import { Category } from "../src/modules/categories/category.model.js"
import { Notification } from "../src/modules/notifications/notification.model.js"
import { Product } from "../src/modules/products/product.model.js"
import { User } from "../src/modules/users/user.model.js"
import { closeRealtime, initRealtime } from "../src/realtime/socket.js"

const sent: { to: string; subject: string }[] = []
vi.mock("../src/utils/email.js", () => ({
  sendEmail: async (to: string, subject: string) => {
    sent.push({ to, subject })
  },
}))

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

type U = { token: string; id: string; email: string; addressId?: string }
let seq = 0
async function user(role?: "admin"): Promise<U> {
  const email = `n${seq++}@example.com`
  const res = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Note User", email, password: "Passw0rdOK" })
  const id = res.body.data.user.id as string
  let token = res.body.data.accessToken as string
  if (role) {
    await User.updateOne({ email }, { role })
    token = (
      await request(app).post(`${A}/auth/login`).send({ email, password: "Passw0rdOK" })
    ).body.data.accessToken
  }
  const addr = await Address.create({
    user: id,
    fullName: "Note User",
    phone: "9876543210",
    line1: "1 Main Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    isDefault: true,
  })
  return { token, id, email, addressId: String(addr._id) }
}

let productId = ""
let adminU: U
beforeEach(async () => {
  sent.length = 0
  adminU = await user("admin")
  const cat = await Category.create({ name: "Mobiles", slug: "mobiles" })
  const p = await Product.create({
    name: "Phone",
    slug: "phone",
    sku: "PH",
    brand: "Acme",
    category: cat._id,
    categoryPath: [cat._id],
    price: 1000,
    mrp: 2000,
    stock: 50,
  })
  productId = String(p._id)
})

let keyN = 0
async function placeOrder(u: U) {
  await request(app)
    .post(`${A}/cart/items`)
    .set(auth(u.token))
    .send({ productId, qty: 1 })
  const res = await request(app)
    .post(`${A}/orders`)
    .set({ ...auth(u.token), "Idempotency-Key": `note-key-${Date.now()}-${keyN++}-xx` })
    .send({ addressId: u.addressId, paymentMethod: "cod" })
  return res.body.data.id as string
}
const adminStatus = (id: string, status: string) =>
  request(app)
    .post(`${A}/admin/orders/${id}/status`)
    .set(auth(adminU.token))
    .send({
      status,
      ...(status === "shipped"
        ? { shipment: { carrier: "Delhivery", trackingId: "TRK123456" } }
        : {}),
    })

async function waitFor<T>(
  fn: () => Promise<T> | T,
  ms = 3000
): Promise<Exclude<T, null | false | undefined>> {
  const t0 = Date.now()
  for (;;) {
    const v = await fn()
    if (v) return v as Exclude<T, null | false | undefined>
    if (Date.now() - t0 > ms) throw new Error("waitFor timed out")
    await new Promise((r) => setTimeout(r, 25))
  }
}

describe("notifications REST", () => {
  it("requires auth", async () => {
    expect((await request(app).get(`${A}/notifications`)).status).toBe(401)
    expect((await request(app).get(`${A}/notifications/unread-count`)).status).toBe(401)
    expect((await request(app).post(`${A}/notifications/read-all`)).status).toBe(401)
  })

  it("is created by the order lifecycle, newest first, with an unread count", async () => {
    const u = await user()
    const id = await placeOrder(u)
    await adminStatus(id, "packed")
    await adminStatus(id, "shipped")
    await waitFor(async () => (await Notification.countDocuments({ user: u.id })) === 3)
    const list = await request(app).get(`${A}/notifications`).set(auth(u.token))
    expect(list.status).toBe(200)
    expect(list.body.data.map((n: { type: string }) => n.type)).toEqual([
      "order.shipped",
      "order.packed",
      "order.placed",
    ])
    expect(list.body.data[0]).toMatchObject({
      category: "orders",
      link: `/orders/${id}`,
      read: false,
    })
    expect(list.body.meta).toMatchObject({ total: 3, unreadCount: 3 })
    const count = await request(app)
      .get(`${A}/notifications/unread-count`)
      .set(auth(u.token))
    expect(count.body.data).toEqual({ count: 3 })
  })

  it("marks one read (idempotent), then all, and filters unread", async () => {
    const u = await user()
    const id = await placeOrder(u)
    await adminStatus(id, "packed")
    await waitFor(async () => (await Notification.countDocuments({ user: u.id })) === 2)
    const first = (await request(app).get(`${A}/notifications`).set(auth(u.token))).body
      .data[0]
    const r1 = await request(app)
      .post(`${A}/notifications/${first.id}/read`)
      .set(auth(u.token))
    const r2 = await request(app)
      .post(`${A}/notifications/${first.id}/read`)
      .set(auth(u.token))
    expect(r1.body.data.unreadCount).toBe(1)
    expect(r2.body.data.unreadCount).toBe(1)
    expect(r2.body.data.notification.readAt).toBe(r1.body.data.notification.readAt)
    const unread = await request(app)
      .get(`${A}/notifications?unread=true`)
      .set(auth(u.token))
    expect(unread.body.data).toHaveLength(1)
    const all = await request(app).post(`${A}/notifications/read-all`).set(auth(u.token))
    expect(all.body.data).toEqual({ updated: 1, unreadCount: 0 })
  })

  it("someone else's notification is 404, and ids are validated", async () => {
    const a = await user()
    const b = await user()
    await placeOrder(a)
    const n = await waitFor(() => Notification.findOne({ user: a.id }))
    const other = await request(app)
      .post(`${A}/notifications/${String(n._id)}/read`)
      .set(auth(b.token))
    expect(other.status).toBe(404)
    expect(
      (
        await request(app)
          .delete(`${A}/notifications/${String(n._id)}`)
          .set(auth(b.token))
      ).status
    ).toBe(404)
    expect(
      (await request(app).post(`${A}/notifications/nope/read`).set(auth(a.token))).status
    ).toBe(422)
    expect(
      (
        await request(app)
          .delete(`${A}/notifications/${String(n._id)}`)
          .set(auth(a.token))
      ).status
    ).toBe(204)
  })

  it("preferences: defaults, partial update, validation, and they gate in-app and email", async () => {
    const u = await user()
    const prefs = await request(app)
      .get(`${A}/notifications/preferences`)
      .set(auth(u.token))
    expect(prefs.body.data).toEqual({
      orders: { inApp: true, email: true },
      offers: { inApp: true, email: false },
      account: { inApp: true, email: true },
    })
    expect(
      (
        await request(app)
          .patch(`${A}/notifications/preferences`)
          .set(auth(u.token))
          .send({})
      ).status
    ).toBe(422)
    const upd = await request(app)
      .patch(`${A}/notifications/preferences`)
      .set(auth(u.token))
      .send({ orders: { email: false } })
    expect(upd.body.data.orders).toEqual({ inApp: true, email: false })

    // email off: in-app yes, no mail
    sent.length = 0
    const id = await placeOrder(u)
    await adminStatus(id, "packed")
    await adminStatus(id, "shipped")
    await waitFor(async () => (await Notification.countDocuments({ user: u.id })) === 3)
    expect(sent.filter((m) => m.to === u.email)).toEqual([])
    // in-app off: nothing stored
    await request(app)
      .patch(`${A}/notifications/preferences`)
      .set(auth(u.token))
      .send({ orders: { inApp: false } })
    await adminStatus(id, "out_for_delivery")
    await adminStatus(id, "delivered")
    await new Promise((r) => setTimeout(r, 150))
    expect(await Notification.countDocuments({ user: u.id })).toBe(3)
  })

  it("sends email for the important steps only", async () => {
    const u = await user()
    sent.length = 0 // the verification mail from registering
    const id = await placeOrder(u)
    await adminStatus(id, "packed") // in-app only
    await adminStatus(id, "shipped")
    await waitFor(() => sent.filter((m) => m.to === u.email).length === 2)
    expect(sent.filter((m) => m.to === u.email).map((m) => m.subject)).toEqual([
      expect.stringContaining("confirmed"),
      expect.stringContaining("shipped"),
    ])
  })

  it("return requests, decisions and refunds notify too", async () => {
    const u = await user()
    const id = await placeOrder(u)
    for (const s of ["packed", "shipped", "out_for_delivery", "delivered"])
      await adminStatus(id, s)
    await request(app)
      .post(`${A}/orders/${id}/return`)
      .set(auth(u.token))
      .send({ reason: "DAMAGED" })
    await request(app)
      .post(`${A}/admin/returns/${id}/decision`)
      .set(auth(adminU.token))
      .send({ decision: "reject", note: "No damage found" })
    await waitFor(async () =>
      Notification.exists({ user: u.id, type: "return.rejected" })
    )
    const types = (await Notification.find({ user: u.id }).lean()).map((n) => n.type)
    expect(types).toEqual(
      expect.arrayContaining(["return.requested", "return.rejected", "order.delivered"])
    )
  })

  it("admin broadcast reaches opted-in customers only and is admin-gated", async () => {
    const a = await user()
    const b = await user()
    await request(app)
      .patch(`${A}/notifications/preferences`)
      .set(auth(b.token))
      .send({ offers: { inApp: false } })
    const denied = await request(app)
      .post(`${A}/admin/notifications/broadcast`)
      .set(auth(a.token))
      .send({ title: "Big sale" })
    expect(denied.status).toBe(403)
    const bad = await request(app)
      .post(`${A}/admin/notifications/broadcast`)
      .set(auth(adminU.token))
      .send({ title: "Big sale", link: "https://evil.example" })
    expect(bad.status).toBe(422)
    const res = await request(app)
      .post(`${A}/admin/notifications/broadcast`)
      .set(auth(adminU.token))
      .send({ title: "Big sale", body: "Up to 50% off" })
    expect(res.status).toBe(201)
    expect(
      await Notification.countDocuments({ user: a.id, type: "offer.broadcast" })
    ).toBe(1)
    expect(await Notification.countDocuments({ user: b.id })).toBe(0)
  })
})

describe("realtime (Socket.io)", () => {
  let server: Server
  let url = ""
  const sockets: Socket[] = []
  beforeEach(async () => {
    server = createServer(createApp())
    initRealtime(server)
    await new Promise<void>((r) => server.listen(0, r))
    url = `http://localhost:${(server.address() as AddressInfo).port}`
  })
  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.close())
    await closeRealtime()
  })
  const open = (token?: string) => {
    const s = connect(url, {
      auth: token === undefined ? {} : { token },
      reconnection: false,
      transports: ["websocket"],
    })
    sockets.push(s)
    return s
  }
  const once = <T>(s: Socket, ev: string) =>
    new Promise<T>((resolve) => s.once(ev, resolve as (v: unknown) => void))

  it("refuses a missing, invalid or expired token with a machine-readable code", async () => {
    const codes: string[] = []
    for (const t of [
      undefined,
      "garbage",
      jwt.sign({ sub: "x", role: "customer" }, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: -10,
      }),
    ]) {
      const s = open(t)
      const err = await once<Error & { data?: { code: string } }>(s, "connect_error")
      codes.push(err.data!.code)
    }
    expect(codes).toEqual(["UNAUTHORIZED", "INVALID_TOKEN", "TOKEN_EXPIRED"])
  })

  it("pushes order:status and notification:new to the owner only, within a moment", async () => {
    const a = await user()
    const b = await user()
    const sa = open(a.token)
    const sb = open(b.token)
    await Promise.all([once(sa, "ready"), once(sb, "ready")])
    const aStatus: { orderId: string; status: string; entry: { status: string } }[] = []
    const aNotes: string[] = []
    const bGot: string[] = []
    sa.on("order:status", (e) => aStatus.push(e))
    sa.on("notification:new", (e: { notification: { type: string } }) =>
      aNotes.push(e.notification.type)
    )
    sb.onAny((ev: string) => bGot.push(ev))

    const id = await placeOrder(a)
    const t0 = Date.now()
    await adminStatus(id, "packed")
    await waitFor(() => aStatus.some((e) => e.status === "packed"))
    expect(Date.now() - t0).toBeLessThan(2000)
    expect(aStatus.find((e) => e.status === "packed")).toMatchObject({
      orderId: id,
      entry: { status: "packed" },
    })
    await waitFor(() => aNotes.includes("order.packed"))
    expect(bGot).toEqual([]) // the other user heard nothing
  })

  it("includes the fresh unread count in notification:new", async () => {
    const a = await user()
    const sa = open(a.token)
    await once(sa, "ready")
    const got = once<{ notification: { type: string }; unreadCount: number }>(
      sa,
      "notification:new"
    )
    await placeOrder(a)
    const n = await got
    expect(n.notification.type).toBe("order.placed")
    expect(n.unreadCount).toBe(1)
  })

  it("cuts a socket off when its access token expires", async () => {
    const a = await user()
    const short = jwt.sign(
      { sub: a.id, role: "customer" },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: 1,
      }
    )
    const s = open(short)
    await once(s, "ready")
    const expired = once(s, "auth:expired")
    const closed = once<string>(s, "disconnect")
    await expired
    expect(await closed).toBe("io server disconnect")
  })
})
