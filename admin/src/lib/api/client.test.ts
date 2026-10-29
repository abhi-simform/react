import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { API, fail, ok, server } from "@/test/server"
import { login, getAccessToken } from "@/lib/auth/session"
import { api, apiPaged } from "./client"
import { ApiError } from "./errors"

const user = { id: "u1", name: "Admin", email: "a@b.c", role: "admin" }

describe("api client", () => {
  it("unwraps { success, data } and paged { data, meta }", async () => {
    server.use(
      http.get(`${API}/thing`, () => HttpResponse.json(ok({ n: 1 }))),
      http.get(`${API}/things`, () =>
        HttpResponse.json(
          ok([1, 2], {
            page: 1,
            limit: 2,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          })
        )
      )
    )
    expect(await api<{ n: number }>("/thing")).toEqual({ n: 1 })
    expect((await apiPaged<number>("/things")).items).toEqual([1, 2])
  })

  it("throws an ApiError carrying code, message and field errors (flattened dotted paths)", async () => {
    server.use(
      http.post(`${API}/x`, () =>
        HttpResponse.json(
          fail("VALIDATION_ERROR", "Validation failed", [
            { in: "body", path: "variants.0.sku", message: "Taken" },
            {
              in: "body",
              path: "variants.0.sku",
              message: "second message loses",
            },
          ]),
          { status: 422 }
        )
      )
    )
    const err = await api("/x", { method: "POST", body: {} }).catch(
      (e: unknown) => e
    )
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(422)
    expect((err as ApiError).code).toBe("VALIDATION_ERROR")
    expect((err as ApiError).fieldErrors).toEqual({ "variants.0.sku": "Taken" })
  })

  it("maps a dead network to NETWORK_ERROR with a readable message", async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()))
    const err = (await api("/down").catch((e: unknown) => e)) as ApiError
    expect(err.code).toBe("NETWORK_ERROR")
    expect(err.message).toMatch(/cannot reach the server/i)
  })

  it("three parallel calls with an expired token trigger exactly ONE refresh, then all succeed", async () => {
    let refreshes = 0
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(ok({ user, accessToken: "old" }))
      ),
      http.post(`${API}/auth/refresh`, () => {
        refreshes += 1
        return HttpResponse.json(ok({ user, accessToken: "fresh" }))
      }),
      http.get(`${API}/admin/ping`, ({ request }) =>
        request.headers.get("authorization") === "Bearer fresh"
          ? HttpResponse.json(ok("pong"))
          : HttpResponse.json(fail("TOKEN_EXPIRED", "Access token expired"), {
              status: 401,
            })
      )
    )
    await login("a@b.c", "pw")
    expect(getAccessToken()).toBe("old")
    const results = await Promise.all([
      api("/admin/ping"),
      api("/admin/ping"),
      api("/admin/ping"),
    ])
    expect(results).toEqual(["pong", "pong", "pong"])
    // The API rotates the refresh token and treats a replay as theft: parallel refreshes would log everyone out.
    expect(refreshes).toBe(1)
    expect(getAccessToken()).toBe("fresh")
  })
})
