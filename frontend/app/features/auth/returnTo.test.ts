import { describe, expect, it } from "vitest"

import { getReturnTo, safeRedirect } from "./returnTo"

describe("safeRedirect: open-redirect attempts", () => {
  it.each([
    "https://evil.com",
    "http://evil.com/x",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    "/ok\r\nLocation: https://evil.com",
    "/ok\tpath",
    "/" + "a".repeat(600),
  ])("rejects %j", (bad) => {
    expect(safeRedirect(bad)).toBe("/")
  })
  it.each([null, undefined, 42, {}, ["/x"]])("rejects non-string %j", (bad) => {
    expect(safeRedirect(bad)).toBe("/")
  })
  it.each([
    "/",
    "/orders",
    "/products?brand=Apple&page=2",
    "/checkout/payment#top",
  ])("keeps the in-app path %s", (ok) => expect(safeRedirect(ok)).toBe(ok))
  it.each([
    "/login",
    "/login?from=/x",
    "/register",
    "/forgot-password",
    "/reset-password/abc",
    "/verify-email#x",
    "/auth/google",
  ])("never bounces back into %s", (p) =>
    expect(safeRedirect(p, "/home")).toBe("/home")
  )
  it("allows paths that merely start like an auth page", () => {
    expect(safeRedirect("/login-help")).toBe("/login-help")
  })
  it("uses the given fallback", () => {
    expect(safeRedirect("//x", "/account")).toBe("/account")
  })
})

describe("getReturnTo", () => {
  it("?from= wins over location.state", () => {
    expect(
      getReturnTo({ search: "?from=/cart", state: { from: "/orders" } })
    ).toBe("/cart")
  })
  it("an unsafe ?from= does not fall through to state", () => {
    expect(
      getReturnTo({ search: "?from=//evil.com", state: { from: "/orders" } })
    ).toBe("/")
  })
  it("falls back to state, then the fallback", () => {
    expect(getReturnTo({ search: "", state: { from: "/orders" } })).toBe(
      "/orders"
    )
    expect(getReturnTo({ search: "", state: null }, "/x")).toBe("/x")
    expect(
      getReturnTo({ search: "", state: { from: "https://evil.com" } })
    ).toBe("/")
  })
})
