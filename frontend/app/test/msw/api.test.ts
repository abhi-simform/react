import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { getMe } from "@/features/auth/auth.api"
import { loginWithPassword } from "@/features/auth/session"
import { getProduct, getProducts } from "@/features/catalog/api"
import { productSchema } from "@/features/catalog/schemas"
import { api, apiPaginated } from "@/lib/api/client"
import { ApiError, ContractError } from "@/lib/api/errors"
import { productDetail } from "@/test/msw/db"
import { server } from "@/test/msw/server"
import { takeUnhandled } from "@/test/msw/unhandled"

import { API, authBody, fail, fakeToken, ok } from "./handlers"

// Replaces the scratch 06/10/11/15 scripts that needed the real backend running.

describe("api client against the fake backend", () => {
  it("validated list + detail", async () => {
    const page = await getProducts({ limit: 5 })
    expect(page.items).toHaveLength(5)
    expect(page.meta.facets?.brands.length).toBeGreaterThan(0)
    const detail = await getProduct(productDetail.slug)
    expect(detail._id).toBe(productDetail._id)
  })

  it("filters and sorts like the real API (brand + sort)", async () => {
    const first = (await getProducts({ limit: 100 })).items[0]!
    const page = await getProducts({
      brand: [first.brand],
      sort: "price_asc",
      limit: 50,
    })
    expect(page.items.every((p) => p.brand === first.brand)).toBe(true)
    const prices = page.items.map((p) => p.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it("404 resolves in fetch but rejects in the client, with code and status", async () => {
    await expect(getProduct("nope")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    })
  })

  it("a 5xx without our envelope still becomes an ApiError", async () => {
    server.use(
      http.get(
        `${API}/boom`,
        () => new HttpResponse("<html>Bad gateway</html>", { status: 502 })
      )
    )
    await expect(api("/boom")).rejects.toMatchObject({
      status: 502,
      code: "HTTP_ERROR",
    })
  })

  it("a network failure is NETWORK_ERROR (status 0)", async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()))
    const err = await api("/down").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      isNetwork: true,
    })
  })

  it("a stalled server times out as TIMEOUT", async () => {
    server.use(http.get(`${API}/slow`, async () => new Promise(() => {})))
    await expect(api("/slow", { timeoutMs: 30 })).rejects.toMatchObject({
      code: "TIMEOUT",
    })
  })

  it("the caller's abort is re-thrown untouched (not an ApiError)", async () => {
    server.use(http.get(`${API}/slow`, async () => new Promise(() => {})))
    const c = new AbortController()
    const p = api("/slow", { signal: c.signal })
    c.abort()
    const err = await p.catch((e: unknown) => e)
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as Error).name).toBe("AbortError")
  })

  it("422 keeps field details", async () => {
    server.use(
      http.post(`${API}/x`, () =>
        fail(422, "VALIDATION_ERROR", "bad", [
          { path: "email", message: "taken" },
        ])
      )
    )
    const err = await api("/x", { method: "POST", body: {} }).catch(
      (e: unknown) => e
    )
    expect((err as ApiError).fieldErrors).toEqual({ email: "taken" })
  })

  describe("contract checks (dev): the schema pinpoints a drifting field", () => {
    it("a renamed field -> ContractError with the path", async () => {
      const renamed = productSchema
        .omit({ name: true })
        .extend({ title: z.string() })
      const err = await api("/products?limit=2", {
        schema: z.array(renamed),
      }).catch((e: unknown) => e)
      expect(err).toBeInstanceOf(ContractError)
      expect((err as ContractError).path).toBe("data.0.title")
    })
    it("a wrong field type -> path of the field", async () => {
      const wrong = productSchema.extend({ price: z.string() })
      const err = await api("/products?limit=1", {
        schema: z.array(wrong),
      }).catch((e: unknown) => e)
      expect((err as ContractError).path).toBe("data.0.price")
    })
    it("a list endpoint without meta is rejected", async () => {
      server.use(http.get(`${API}/products`, () => ok([])))
      await expect(
        apiPaginated("/products", { schema: productSchema })
      ).rejects.toBeInstanceOf(ContractError)
    })
  })
})

describe("request building (from the old scratch/15 checks)", () => {
  it("repeated query keys, skipped undefined/null, JSON body with its header", async () => {
    let seen: { url: string; type: string | null; body: unknown } | undefined
    server.use(
      http.post(`${API}/echo`, async ({ request }) => {
        seen = {
          url: request.url,
          type: request.headers.get("content-type"),
          body: await request.json(),
        }
        return ok({ fine: true })
      })
    )
    await api("/echo", {
      method: "POST",
      query: { a: [1, 2], b: undefined, c: null, d: "x y" },
      body: { n: 1 },
    })
    expect(new URL(seen!.url).search).toBe("?a=1&a=2&d=x+y")
    expect(seen!.type).toBe("application/json")
    expect(seen!.body).toEqual({ n: 1 })
  })

  it("FormData is sent untouched (the browser sets the multipart boundary)", async () => {
    let type: string | null = null
    server.use(
      http.post(`${API}/upload`, ({ request }) => {
        type = request.headers.get("content-type")
        return ok({ fine: true })
      })
    )
    const form = new FormData()
    form.append("file", new Blob(["x"]), "a.txt")
    await api("/upload", { method: "POST", body: form })
    expect(type).toMatch(/^multipart\/form-data; boundary=/)
  })

  it("a 204 resolves to undefined", async () => {
    server.use(
      http.delete(`${API}/gone`, () => new HttpResponse(null, { status: 204 }))
    )
    await expect(api("/gone", { method: "DELETE" })).resolves.toBeUndefined()
  })

  it("auth: true sends the bearer token; a call without it does not", async () => {
    await loginWithPassword({
      email: "customer@shopsphere.dev",
      password: "Password123",
    })
    const headers: (string | null)[] = []
    server.use(
      http.get(
        `${API}/who`,
        ({ request }) => (
          headers.push(request.headers.get("authorization")),
          ok({})
        )
      )
    )
    await api("/who", { auth: true })
    await api("/who")
    expect(headers[0]).toMatch(/^Bearer /)
    expect(headers[1]).toBeNull()
  })
})

describe("single-flight token refresh", () => {
  it("three parallel 401s share exactly ONE refresh, then each retries once", async () => {
    await loginWithPassword({
      email: "customer@shopsphere.dev",
      password: "Password123",
    })
    const counts = { refresh: 0, me: 0 }
    let current = ""
    server.use(
      http.post(`${API}/auth/refresh`, async () => {
        counts.refresh++
        await new Promise((r) => setTimeout(r, 20)) // slow enough that all 3 failures are in flight
        current = fakeToken(1234) // a DIFFERENT valid token
        return ok({ ...authBody(), accessToken: current })
      }),
      http.get(`${API}/users/me`, ({ request }) => {
        counts.me++
        return request.headers.get("authorization") === `Bearer ${current}`
          ? ok(authBody().user)
          : fail(401, "TOKEN_EXPIRED", "Token expired")
      })
    )
    const users = await Promise.all([getMe(), getMe(), getMe()])
    expect(users.every((u) => u.email === "customer@shopsphere.dev")).toBe(true)
    expect(counts.refresh).toBe(1)
    expect(counts.me).toBe(6) // 3 rejected + 3 retried
  })

  it("a refresh that itself fails with 401 ends the session; the request fails", async () => {
    await loginWithPassword({
      email: "customer@shopsphere.dev",
      password: "Password123",
    })
    let refreshes = 0
    server.use(
      http.post(
        `${API}/auth/refresh`,
        () => (refreshes++, fail(401, "INVALID_TOKEN", "gone"))
      ),
      http.get(`${API}/users/me`, () =>
        fail(401, "TOKEN_EXPIRED", "Token expired")
      )
    )
    await expect(getMe()).rejects.toMatchObject({ status: 401 })
    expect(refreshes).toBe(1)
  })

  it("a wrong password (401 INVALID_CREDENTIALS) is NOT a reason to refresh", async () => {
    let refreshes = 0
    server.use(
      http.post(`${API}/auth/refresh`, () => (refreshes++, ok(authBody())))
    )
    await expect(
      loginWithPassword({ email: "customer@shopsphere.dev", password: "nope" })
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" })
    expect(refreshes).toBe(0)
  })
})

describe("the safety net itself", () => {
  it("an unmocked request fails loudly (onUnhandledRequest: error)", async () => {
    const err = await api("/not-mocked-anywhere").catch((e: unknown) => e)
    // MSW errors the request: the client reports a network failure rather than silently succeeding
    expect(err).toBeInstanceOf(ApiError)
    // ...and setup.ts would FAIL this test for it, unless the test takes the record (here, on purpose)
    expect(takeUnhandled()).toEqual([`GET ${API}/not-mocked-anywhere`])
  })
})
