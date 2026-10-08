import request from "supertest"
import { describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"

const app = createApp()
const creds = { name: "Test User", email: "test@example.com", password: "Passw0rdOK" }

async function registerAgent() {
  const agent = request.agent(app) // keeps cookies between calls, like a browser
  const res = await agent.post("/api/v1/auth/register").send(creds)
  return { agent, res }
}

describe("auth", () => {
  it("registers, returns an access token and sets an httpOnly refresh cookie", async () => {
    const { res } = await registerAgent()
    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeTypeOf("string")
    expect(res.body.data.user).toMatchObject({ email: creds.email, role: "customer" })
    expect(res.body.data.user.passwordHash).toBeUndefined()
    const cookie = res.headers["set-cookie"]?.[0] ?? ""
    expect(cookie).toContain("refreshToken=")
    expect(cookie).toContain("HttpOnly")
  })

  it("rejects duplicate email, weak password and malformed body with the error envelope", async () => {
    await registerAgent()
    const dup = await request(app).post("/api/v1/auth/register").send(creds)
    expect(dup.status).toBe(409)
    expect(dup.body).toMatchObject({ success: false, error: { code: "EMAIL_TAKEN" } })

    const weak = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...creds, email: "b@example.com", password: "short" })
    expect(weak.status).toBe(422)
    expect(weak.body.error.code).toBe("VALIDATION_ERROR")
    expect(weak.body.error.details[0]).toHaveProperty("path")
  })

  it("blocks NoSQL-injection style login payloads", async () => {
    await registerAgent()
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: { $ne: null }, password: { $ne: null } })
    expect(res.status).toBe(422)
  })

  it("logs in, and rejects a wrong password", async () => {
    await registerAgent()
    const ok = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: creds.email, password: creds.password })
    expect(ok.status).toBe(200)
    const bad = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: creds.email, password: "Wrong1234" })
    expect(bad.status).toBe(401)
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("protects /users/me and serves it with a valid token", async () => {
    const { res } = await registerAgent()
    expect((await request(app).get("/api/v1/users/me")).status).toBe(401)
    const me = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${res.body.data.accessToken}`)
    expect(me.status).toBe(200)
    expect(me.body.data.email).toBe(creds.email)
  })

  it("rotates the refresh token and detects reuse of an old one", async () => {
    const { res } = await registerAgent()
    const oldCookie = res.headers["set-cookie"]![0]!.split(";")[0]!

    const rotated = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", oldCookie)
    expect(rotated.status).toBe(200)
    expect(rotated.body.data.accessToken).toBeTypeOf("string")
    const newCookie = rotated.headers["set-cookie"]![0]!.split(";")[0]!
    expect(newCookie).not.toBe(oldCookie)

    // Replaying the already-used token => 401 and the whole family is revoked.
    const reuse = await request(app).post("/api/v1/auth/refresh").set("Cookie", oldCookie)
    expect(reuse.status).toBe(401)
    expect(reuse.body.error.code).toBe("REFRESH_REUSE")
    const afterReuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", newCookie)
    expect(afterReuse.status).toBe(401)
  })

  it("logout revokes the session", async () => {
    const { agent } = await registerAgent()
    expect((await agent.post("/api/v1/auth/logout")).status).toBe(204)
    expect((await agent.post("/api/v1/auth/refresh")).status).toBe(401)
  })
})
