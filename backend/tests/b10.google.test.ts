import request from "supertest"
import { describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { safeRedirect } from "../src/modules/auth/google.js"
import { User } from "../src/modules/users/user.model.js"

const app = createApp()
const A = "/api/v1/auth"
const CLIENT = "http://localhost:5173/auth/google/callback"

/** Runs the whole redirect dance against the mock Google, with one cookie jar, like a browser. */
async function googleLogin(
  form: Record<string, string>,
  opts: { redirect?: string; tamperState?: boolean } = {}
) {
  const agent = request.agent(app)
  const start = await agent
    .get(`${A}/google`)
    .query(opts.redirect ? { redirect: opts.redirect } : {})
  expect(start.status).toBe(302)
  const mock = new URL(start.headers.location!, "http://x")
  expect(mock.pathname).toBe(`${A}/google/mock`)
  const state = opts.tamperState ? "0".repeat(32) : mock.searchParams.get("state")!
  const cb = await agent.get(`${A}/google/callback`).query({ state, ...form })
  expect(cb.status).toBe(302)
  const to = new URL(cb.headers.location!)
  return { agent, cb, to, params: to.searchParams }
}
const allow = (email: string, extra: Record<string, string> = {}) => ({
  decision: "allow",
  email,
  name: "Gabby Google",
  verified: "1",
  ...extra,
})

describe("B10: Google sign-in (mock Google)", () => {
  it("creates an account, sets the refresh cookie, and redirects to the SPA callback", async () => {
    const { agent, cb, to, params } = await googleLogin(allow("new@gmail.test"), {
      redirect: "/orders/123",
    })
    expect(`${to.origin}${to.pathname}`).toBe(CLIENT)
    expect(params.get("redirect")).toBe("/orders/123")
    expect(params.get("created")).toBe("1")
    expect(params.get("error")).toBeNull()
    const cookies = cb.headers["set-cookie"] as unknown as string[]
    expect(
      cookies.some((c) => c.startsWith("refreshToken=") && c.includes("HttpOnly"))
    ).toBe(true)

    // The SPA's next step: silent refresh gives an access token and the same user shape.
    const refreshed = await agent.post(`${A}/refresh`)
    expect(refreshed.status).toBe(200)
    expect(refreshed.body.data.user).toMatchObject({
      email: "new@gmail.test",
      emailVerified: true,
      providers: ["google"],
    })
    expect(refreshed.body.data.user.googleId).toBeUndefined()
  })

  it("signs the same Google account in again without creating a duplicate", async () => {
    await googleLogin(allow("again@gmail.test"))
    const second = await googleLogin(allow("again@gmail.test"))
    expect(second.params.get("created")).toBeNull()
    expect(second.params.get("linked")).toBeNull()
    expect(await User.countDocuments({ email: "again@gmail.test" })).toBe(1)
  })

  it("links to an existing VERIFIED password account, which keeps its password", async () => {
    await User.create({
      name: "Pat",
      email: "pat@gmail.test",
      passwordHash: "x",
      emailVerified: true,
    })
    const { params } = await googleLogin(allow("pat@gmail.test"))
    expect(params.get("linked")).toBe("1")
    const u = (await User.findOne({ email: "pat@gmail.test" }).select(
      "+passwordHash +googleId"
    ))!
    expect(u.googleId).toBeTruthy()
    expect(u.passwordHash).toBe("x")
    expect(u.authProviders).toEqual(expect.arrayContaining(["password", "google"]))
  })

  it("linking to an UNVERIFIED password account drops the password and its sessions (pre-hijack defence)", async () => {
    const reg = await request(app)
      .post(`${A}/register`)
      .send({ name: "Victim", email: "vic@gmail.test", password: "Passw0rdOK" })
    const attackerCookie = reg.headers["set-cookie"]![0]!.split(";")[0]!
    const { params } = await googleLogin(allow("vic@gmail.test"))
    expect(params.get("linked")).toBe("1")
    const u = (await User.findOne({ email: "vic@gmail.test" }).select("+passwordHash"))!
    expect(u.passwordHash).toBeUndefined()
    expect(u.emailVerified).toBe(true)
    expect(
      (await request(app).post(`${A}/refresh`).set("Cookie", attackerCookie)).status
    ).toBe(401)
    const pw = await request(app)
      .post(`${A}/login`)
      .send({ email: "vic@gmail.test", password: "Passw0rdOK" })
    expect(pw.status).toBe(401)
  })

  it("refuses an email Google has not verified", async () => {
    const { params } = await googleLogin({ ...allow("unv@gmail.test"), verified: "" })
    expect(params.get("error")).toBe("email_not_verified")
    expect(await User.countDocuments({ email: "unv@gmail.test" })).toBe(0)
  })

  it("Cancel at Google redirects with access_denied and creates nothing", async () => {
    const { params } = await googleLogin({ decision: "deny" }, { redirect: "/cart" })
    expect(params.get("error")).toBe("access_denied")
    expect(params.get("redirect")).toBe("/cart")
    expect(await User.countDocuments()).toBe(0)
  })

  it("rejects a wrong or missing state (CSRF) and a disabled account", async () => {
    const bad = await googleLogin(allow("csrf@gmail.test"), { tamperState: true })
    expect(bad.params.get("error")).toBe("invalid_state")
    const noCookie = await request(app)
      .get(`${A}/google/callback`)
      .query({ state: "a".repeat(32), ...allow("csrf@gmail.test") })
    expect(new URL(noCookie.headers.location!).searchParams.get("error")).toBe(
      "invalid_state"
    )
    expect(await User.countDocuments({ email: "csrf@gmail.test" })).toBe(0)

    await User.create({
      name: "Off",
      email: "off@gmail.test",
      isActive: false,
      emailVerified: true,
    })
    const off = await googleLogin(allow("off@gmail.test"))
    expect(off.params.get("error")).toBe("account_disabled")
  })

  it("never redirects off-site: unsafe `redirect` values collapse to /", async () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeRedirect(bad)).toBe("/")
    }
    expect(safeRedirect("/orders?x=1#top")).toBe("/orders?x=1#top")
    const { params } = await googleLogin(allow("r@gmail.test"), {
      redirect: "//evil.com",
    })
    expect(params.get("redirect")).toBe("/")
  })

  it("mock consent page is served only in mock mode, and password login still refuses Google-only users", async () => {
    const page = await request(app).get(`${A}/google/mock`).query({ state: "abc" })
    expect(page.status).toBe(200)
    expect(page.text).toContain("Mock Google sign-in")
    const { agent } = await googleLogin(allow("go@gmail.test"))
    const res = await request(app)
      .post(`${A}/login`)
      .send({ email: "go@gmail.test", password: "Passw0rdOK" })
    expect(res.status).toBe(401)
    const { accessToken } = (await agent.post(`${A}/refresh`)).body.data
    const cp = await request(app)
      .post(`${A}/change-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "a", newPassword: "NewPassw0rd" })
    expect(cp.status).toBe(409)
    expect(cp.body.error.code).toBe("NO_PASSWORD")
  })
})
