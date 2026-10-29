import type { ErrorEvent } from "@sentry/react"
import { describe, expect, it } from "vitest"

import {
  scrubBreadcrumb,
  scrubDeep,
  scrubEvent,
  scrubString,
  scrubUrl,
} from "./scrub"

const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"

describe("scrubString", () => {
  it("removes e-mail addresses, bearer tokens and JWTs", () => {
    expect(scrubString("failed for jane.doe+shop@example.co.in")).toBe(
      "failed for [email]"
    )
    expect(scrubString(`Authorization: Bearer ${JWT}`)).toBe(
      "Authorization: Bearer [token]"
    )
    expect(scrubString(`token ${JWT} expired`)).toBe("token [token] expired")
  })

  it("drops the query string of any URL in a message, keeps the path", () => {
    expect(
      scrubString(
        "GET https://api.example.com/api/v1/products?search=jane@x.com&page=2 failed"
      )
    ).toBe("GET https://api.example.com/api/v1/products?[query] failed")
    expect(scrubString("at /reset-password?token=abc123 line 4")).toBe(
      "at /reset-password?[query] line 4"
    )
  })

  it("leaves harmless text alone", () => {
    expect(
      scrubString("Cannot read properties of undefined (reading 'price')")
    ).toBe("Cannot read properties of undefined (reading 'price')")
  })
})

describe("scrubUrl", () => {
  it("keeps origin and path only", () => {
    expect(
      scrubUrl("https://shop.example.com/reset-password?token=abc#frag")
    ).toBe("https://shop.example.com/reset-password")
    expect(scrubUrl("/verify-email?token=abc")).toBe("/verify-email")
    expect(scrubUrl("https://shop.example.com/p/phone-1")).toBe(
      "https://shop.example.com/p/phone-1"
    )
  })
})

describe("scrubDeep", () => {
  it("redacts secret-looking keys at any depth and cleans nested strings", () => {
    const out = scrubDeep({
      ok: "fine",
      password: "hunter2",
      nested: {
        accessToken: "x",
        note: "mail me@x.io",
        list: [{ email: "a@b.co" }],
      },
      data: { url: "https://api.example.com/a?b=1", status: 500 },
    })
    expect(out).toEqual({
      ok: "fine",
      password: "[redacted]",
      nested: {
        accessToken: "[redacted]",
        note: "mail [email]",
        list: [{ email: "[redacted]" }],
      },
      data: { url: "https://api.example.com/a", status: 500 },
    })
  })
})

describe("scrubBreadcrumb", () => {
  it("cleans a fetch breadcrumb", () => {
    const crumb = scrubBreadcrumb({
      category: "fetch",
      data: {
        url: "https://api.example.com/api/v1/users?email=a@b.co",
        method: "GET",
        status_code: 200,
      },
    })
    expect(crumb.data).toEqual({
      url: "https://api.example.com/api/v1/users",
      method: "GET",
      status_code: 200,
    })
  })
})

describe("scrubEvent", () => {
  const dirty = {
    type: undefined,
    message: "Could not reach jane@example.com",
    exception: { values: [{ type: "Error", value: `bad token ${JWT}` }] },
    user: {
      id: "u_1",
      email: "jane@example.com",
      username: "jane",
      ip_address: "1.2.3.4",
    },
    request: {
      url: "https://shop.example.com/reset-password?token=secret",
      headers: { Authorization: `Bearer ${JWT}`, Cookie: "refresh=abc" },
      cookies: { refresh: "abc" },
      data: { password: "x" },
    },
    breadcrumbs: [
      {
        category: "navigation",
        data: { from: "/a?x=1", to: "/reset-password?token=secret" },
      },
    ],
    extra: { componentStack: "at Foo", authToken: "abc" },
    tags: { context: "boundary:rail", request_id: "req-123" },
    release: "abc1234",
    environment: "production",
  } as unknown as ErrorEvent

  it("sends the user id and nothing else about the user", () => {
    expect(scrubEvent(dirty)?.user).toEqual({ id: "u_1" })
  })

  it("removes e-mails, tokens, cookies, headers, bodies and query strings", () => {
    const text = JSON.stringify(scrubEvent(dirty))
    for (const leak of [
      "jane@example.com",
      JWT,
      "refresh=abc",
      "token=secret",
      "hunter",
      "1.2.3.4",
      "Cookie",
    ])
      expect(text).not.toContain(leak)
    expect(scrubEvent(dirty)?.request).toEqual({
      url: "https://shop.example.com/reset-password",
    })
  })

  it("keeps what makes the event useful", () => {
    const e = scrubEvent(dirty)
    expect(e?.release).toBe("abc1234")
    expect(e?.environment).toBe("production")
    expect(e?.tags?.request_id).toBe("req-123")
    expect(e?.extra?.componentStack).toBe("at Foo")
    expect(e?.exception?.values?.[0]?.type).toBe("Error")
  })

  it("an anonymous event has no user at all", () => {
    const anon = scrubEvent({
      ...dirty,
      user: { email: "x@y.zz" },
    } as unknown as ErrorEvent)
    expect(anon?.user).toBeUndefined()
  })
})
