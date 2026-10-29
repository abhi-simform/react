import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { Notification } from "../src/modules/notifications/notification.model.js"
import { RefreshToken } from "../src/modules/auth/refreshToken.model.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1"
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

async function account(email: string, role: "customer" | "seller" | "admin") {
  const reg = await request(app)
    .post(`${A}/auth/register`)
    .send({ name: "Test User", email, password: "Passw0rdOK" })
  const id = reg.body.data.user.id as string
  if (role === "customer") return { token: reg.body.data.accessToken as string, id }
  await User.updateOne({ _id: id }, { role })
  const res = await request(app)
    .post(`${A}/auth/login`)
    .send({ email, password: "Passw0rdOK" })
  return { token: res.body.data.accessToken as string, id }
}

let admin: { token: string; id: string }
let customer: { token: string; id: string }
const application = {
  businessName: "Nova Traders",
  phone: "9876543210",
  about: "Phone accessories",
}

beforeEach(async () => {
  admin = await account("admin@example.com", "admin")
  customer = await account("c@example.com", "customer")
})

describe("seller applications", () => {
  it("a customer applies once; a second pending application is refused", async () => {
    const res = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send(application)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      status: "pending",
      businessName: "Nova Traders",
    })
    const again = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send(application)
    expect(again.status).toBe(409)
    expect(again.body.error.code).toBe("APPLICATION_PENDING")
    const mine = await request(app)
      .get(`${A}/seller-applications/mine`)
      .set(auth(customer.token))
    expect(mine.body.data.status).toBe("pending")
  })

  it("validates the body and refuses accounts that can already sell", async () => {
    const bad = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send({ ...application, phone: "123" })
    expect(bad.status).toBe(422)
    expect(bad.body.error.details[0].path).toBe("phone")
    const seller = await account("s@example.com", "seller")
    const res = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(seller.token))
      .send(application)
    expect(res.body.error.code).toBe("ALREADY_SELLER")
    expect(
      (await request(app).post(`${A}/seller-applications`).send(application)).status
    ).toBe(401)
  })

  it("admin approves: role becomes seller, sessions are revoked, the applicant is told; deciding twice is 409", async () => {
    const created = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send(application)
    const id = created.body.data.id as string
    const list = await request(app)
      .get(`${A}/admin/seller-applications?status=pending`)
      .set(auth(admin.token))
    expect(list.body.data).toHaveLength(1)
    expect(list.body.data[0].user.email).toBe("c@example.com")

    const res = await request(app)
      .post(`${A}/admin/seller-applications/${id}/decision`)
      .set(auth(admin.token))
      .send({ decision: "approve" })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe("approved")
    expect((await User.findById(customer.id))!.role).toBe("seller")
    expect(
      await RefreshToken.countDocuments({ user: customer.id, revokedAt: null })
    ).toBe(0)
    expect(
      await Notification.countDocuments({ user: customer.id, type: "seller.approved" })
    ).toBe(1)

    const twice = await request(app)
      .post(`${A}/admin/seller-applications/${id}/decision`)
      .set(auth(admin.token))
      .send({ decision: "reject", note: "Too late" })
    expect(twice.status).toBe(409)
    expect(twice.body.error.code).toBe("ALREADY_REVIEWED")
  })

  it("rejecting needs a reason and leaves the role alone; non-admins are refused", async () => {
    const created = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send(application)
    const id = created.body.data.id as string
    const noNote = await request(app)
      .post(`${A}/admin/seller-applications/${id}/decision`)
      .set(auth(admin.token))
      .send({ decision: "reject" })
    expect(noNote.status).toBe(422)
    expect(noNote.body.error.details[0].path).toBe("note")
    const ok = await request(app)
      .post(`${A}/admin/seller-applications/${id}/decision`)
      .set(auth(admin.token))
      .send({ decision: "reject", note: "GSTIN missing" })
    expect(ok.body.data).toMatchObject({
      status: "rejected",
      reviewNote: "GSTIN missing",
    })
    expect((await User.findById(customer.id))!.role).toBe("customer")
    const denied = await request(app)
      .get(`${A}/admin/seller-applications`)
      .set(auth(customer.token))
    expect(denied.status).toBe(403)
    // after a rejection the customer may apply again
    const retry = await request(app)
      .post(`${A}/seller-applications`)
      .set(auth(customer.token))
      .send(application)
    expect(retry.status).toBe(201)
  })

  it("seller detail returns catalog and sales numbers; a customer id is 404", async () => {
    const seller = await account("s@example.com", "seller")
    const res = await request(app)
      .get(`${A}/admin/sellers/${seller.id}`)
      .set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      email: "s@example.com",
      products: { total: 0 },
      sales: { revenue: 0 },
    })
    const notSeller = await request(app)
      .get(`${A}/admin/sellers/${customer.id}`)
      .set(auth(admin.token))
    expect(notSeller.status).toBe(404)
  })
})

describe("system health, settings and the audit diff", () => {
  it("health reports dependencies to admins only", async () => {
    const res = await request(app).get(`${A}/admin/system/health`).set(auth(admin.token))
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe("ok")
    expect(res.body.data.checks.map((c: { name: string }) => c.name)).toContain("MongoDB")
    expect(
      (await request(app).get(`${A}/admin/system/health`).set(auth(customer.token)))
        .status
    ).toBe(403)
  })

  it("settings: defaults, validated partial update, and the change lands in the audit log", async () => {
    const before = await request(app)
      .get(`${A}/admin/system/settings`)
      .set(auth(admin.token))
    expect(before.body.data.editable.lowStockThreshold).toBe(5)
    const bad = await request(app)
      .patch(`${A}/admin/system/settings`)
      .set(auth(admin.token))
      .send({ lowStockThreshold: -1 })
    expect(bad.status).toBe(422)
    const res = await request(app)
      .patch(`${A}/admin/system/settings`)
      .set(auth(admin.token))
      .send({ lowStockThreshold: 12 })
    expect(res.body.data.lowStockThreshold).toBe(12)
    await new Promise((r) => setTimeout(r, 100)) // the audit row is written after the response
    const log = await request(app)
      .get(`${A}/admin/audit-logs?entity=system`)
      .set(auth(admin.token))
    expect(log.body.data[0]).toMatchObject({
      action: "PATCH /admin/system/settings",
      changes: { lowStockThreshold: { before: 5, after: 12 } },
    })
  })

  it("a role change is audited with actor and before/after, filterable by entity", async () => {
    const res = await request(app)
      .patch(`${A}/admin/users/${customer.id}/role`)
      .set(auth(admin.token))
      .send({ role: "seller" })
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 100))
    const log = await request(app)
      .get(`${A}/admin/audit-logs?entity=users&action=PATCH`)
      .set(auth(admin.token))
    expect(log.body.data).toHaveLength(1)
    expect(log.body.data[0]).toMatchObject({
      actor: { email: "admin@example.com" },
      action: "PATCH /admin/users/:id/role",
      changes: { role: { before: "customer", after: "seller" } },
    })
    const other = await request(app)
      .get(`${A}/admin/audit-logs?entity=orders`)
      .set(auth(admin.token))
    expect(other.body.data).toHaveLength(0)
  })
})
