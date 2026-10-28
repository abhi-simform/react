import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "../src/app.js"
import { User } from "../src/modules/users/user.model.js"

// Capture outgoing mail so tests can click the "links" like a user would.
const sent: { to: string; subject: string; html: string }[] = []
vi.mock("../src/utils/email.js", () => ({
  sendEmail: async (to: string, subject: string, html: string) => {
    sent.push({ to, subject, html })
  },
}))

const app = createApp()
const A = "/api/v1/auth"
const creds = { name: "Test User", email: "b10@example.com", password: "Passw0rdOK" }
const tokenFrom = (html: string) => /token=([a-f0-9]+)/.exec(html)![1]!
const cookieOf = (res: request.Response) => res.headers["set-cookie"]![0]!.split(";")[0]!

beforeEach(() => {
  sent.length = 0
})

async function registerAndLogin() {
  const reg = await request(app).post(`${A}/register`).send(creds)
  const second = await request(app)
    .post(`${A}/login`)
    .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0) Firefox/130.0")
    .send({ email: creds.email, password: creds.password })
  return { reg, second }
}

describe("B10: email verification", () => {
  it("verifies once; a second click says already verified; garbage is INVALID_TOKEN", async () => {
    await request(app).post(`${A}/register`).send(creds)
    const token = tokenFrom(sent[0]!.html)
    const ok = await request(app).post(`${A}/verify-email`).send({ token })
    expect(ok.status).toBe(200)
    expect(ok.body.data.alreadyVerified).toBe(false)
    expect((await User.findOne({ email: creds.email }))!.emailVerified).toBe(true)

    const again = await request(app).post(`${A}/verify-email`).send({ token })
    expect(again.status).toBe(200)
    expect(again.body.data.alreadyVerified).toBe(true)

    const bad = await request(app)
      .post(`${A}/verify-email`)
      .send({ token: "f".repeat(64) })
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe("INVALID_TOKEN")
  })

  it("reports an expired link as TOKEN_EXPIRED", async () => {
    await request(app).post(`${A}/register`).send(creds)
    const token = tokenFrom(sent[0]!.html)
    await User.updateOne(
      { email: creds.email },
      { emailVerifyExpires: new Date(Date.now() - 1000) }
    )
    const res = await request(app).post(`${A}/verify-email`).send({ token })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("TOKEN_EXPIRED")
  })

  it("resend needs auth and has a 60 second cooldown", async () => {
    const reg = await request(app).post(`${A}/register`).send(creds)
    const bearer = { Authorization: `Bearer ${reg.body.data.accessToken}` }
    expect((await request(app).post(`${A}/resend-verification`)).status).toBe(401)
    const res = await request(app).post(`${A}/resend-verification`).set(bearer)
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe("RESEND_COOLDOWN")
    await User.updateOne(
      { email: creds.email },
      { emailVerifySentAt: new Date(Date.now() - 61_000) }
    )
    expect((await request(app).post(`${A}/resend-verification`).set(bearer)).status).toBe(
      200
    )
    expect(sent).toHaveLength(2)
  })
})

describe("B10: forgot / reset password", () => {
  it("answers identically for known and unknown emails, and sends mail only to the real one", async () => {
    await request(app).post(`${A}/register`).send(creds)
    sent.length = 0
    const known = await request(app)
      .post(`${A}/forgot-password`)
      .send({ email: creds.email })
    const unknown = await request(app)
      .post(`${A}/forgot-password`)
      .send({ email: "nobody@example.com" })
    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body).toEqual(unknown.body)
    expect(sent).toHaveLength(1)
  })

  it("resets once, signs out every session, and rejects reuse / expiry", async () => {
    const { second } = await registerAndLogin()
    sent.length = 0
    await request(app).post(`${A}/forgot-password`).send({ email: creds.email })
    const token = tokenFrom(sent[0]!.html)

    const weak = await request(app)
      .post(`${A}/reset-password`)
      .send({ token, password: "weak" })
    expect(weak.status).toBe(422)

    const ok = await request(app)
      .post(`${A}/reset-password`)
      .send({ token, password: "NewPassw0rd" })
    expect(ok.status).toBe(200)
    // old session is dead
    const refresh = await request(app)
      .post(`${A}/refresh`)
      .set("Cookie", cookieOf(second))
    expect(refresh.status).toBe(401)
    // new password works, old does not
    expect(
      (
        await request(app)
          .post(`${A}/login`)
          .send({ email: creds.email, password: "NewPassw0rd" })
      ).status
    ).toBe(200)
    expect(
      (
        await request(app)
          .post(`${A}/login`)
          .send({ email: creds.email, password: creds.password })
      ).status
    ).toBe(401)
    // single use
    const reuse = await request(app)
      .post(`${A}/reset-password`)
      .send({ token, password: "Another1Pass" })
    expect(reuse.body.error.code).toBe("INVALID_TOKEN")
  })

  it("reports an expired reset link as TOKEN_EXPIRED", async () => {
    await request(app).post(`${A}/register`).send(creds)
    sent.length = 0
    await request(app).post(`${A}/forgot-password`).send({ email: creds.email })
    await User.updateOne(
      { email: creds.email },
      { passwordResetExpires: new Date(Date.now() - 1000) }
    )
    const res = await request(app)
      .post(`${A}/reset-password`)
      .send({ token: tokenFrom(sent[0]!.html), password: "NewPassw0rd" })
    expect(res.body.error.code).toBe("TOKEN_EXPIRED")
  })
})

describe("B10: sessions", () => {
  it("lists sessions (marking this one), revokes another, which then fails to refresh", async () => {
    const { reg, second } = await registerAndLogin()
    const bearer = { Authorization: `Bearer ${reg.body.data.accessToken}` }
    expect((await request(app).get(`${A}/sessions`)).status).toBe(401)

    const list = await request(app)
      .get(`${A}/sessions`)
      .set(bearer)
      .set("Cookie", cookieOf(reg))
    expect(list.status).toBe(200)
    expect(list.body.data).toHaveLength(2)
    const current = list.body.data.filter((s: { current: boolean }) => s.current)
    expect(current).toHaveLength(1)
    const other = list.body.data.find((s: { current: boolean }) => !s.current)
    expect(other.device).toBe("Firefox on Windows")

    const del = await request(app)
      .delete(`${A}/sessions/${other.id}`)
      .set(bearer)
      .set("Cookie", cookieOf(reg))
    expect(del.status).toBe(204)
    expect(
      (await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(second))).status
    ).toBe(401)
    // this device still works
    expect(
      (await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(reg))).status
    ).toBe(200)
  })

  it("keeps rotating the same session id and its start time; unknown / foreign ids are 404; bad id is 422", async () => {
    const reg = await request(app).post(`${A}/register`).send(creds)
    const bearer = { Authorization: `Bearer ${reg.body.data.accessToken}` }
    const before = (await request(app).get(`${A}/sessions`).set(bearer)).body.data[0]
    const rotated = await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(reg))
    const after = (
      await request(app).get(`${A}/sessions`).set(bearer).set("Cookie", cookieOf(rotated))
    ).body.data
    expect(after).toHaveLength(1)
    expect(after[0].id).toBe(before.id)
    expect(after[0].startedAt).toBe(before.startedAt)
    expect(after[0].current).toBe(true)

    const other = await request(app)
      .post(`${A}/register`)
      .send({ ...creds, email: "other@example.com" })
    const otherBearer = { Authorization: `Bearer ${other.body.data.accessToken}` }
    expect(
      (await request(app).delete(`${A}/sessions/${before.id}`).set(otherBearer)).status
    ).toBe(404)
    expect((await request(app).delete(`${A}/sessions/nope`).set(bearer)).status).toBe(422)
  })

  it("change-password signs out OTHER sessions but keeps this one; logout-all ends everything", async () => {
    const { reg, second } = await registerAndLogin()
    const bearer = { Authorization: `Bearer ${reg.body.data.accessToken}` }
    const wrong = await request(app)
      .post(`${A}/change-password`)
      .set(bearer)
      .send({ currentPassword: "Wrong1234", newPassword: "NewPassw0rd" })
    expect(wrong.status).toBe(401)

    const ok = await request(app)
      .post(`${A}/change-password`)
      .set(bearer)
      .set("Cookie", cookieOf(reg))
      .send({ currentPassword: creds.password, newPassword: "NewPassw0rd" })
    expect(ok.status).toBe(200)
    expect(
      (await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(second))).status
    ).toBe(401)
    const still = await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(reg))
    expect(still.status).toBe(200)

    const all = await request(app)
      .post(`${A}/logout-all`)
      .set({ Authorization: `Bearer ${still.body.data.accessToken}` })
    expect(all.status).toBe(204)
    expect(
      (await request(app).post(`${A}/refresh`).set("Cookie", cookieOf(still))).status
    ).toBe(401)
  })
})
