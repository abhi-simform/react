// Run: node --import ./scratch/register-alias.mjs scratch/15-api-client.ts
// 6.2 sanity script: the api client against a tiny local node:http server (no backend needed).
import assert from "node:assert/strict"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"

const requests: {
  method?: string
  url?: string
  headers: Record<string, unknown>
  body: string
}[] = []
let tokenCalls = 0

const server = createServer((req, res) => {
  let body = ""
  req.on("data", (c) => (body += c))
  req.on("end", () => {
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    })
    const url = req.url ?? ""
    const json = (status: number, payload: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(payload))
    }
    if (url.startsWith("/ok"))
      return json(200, { success: true, data: { echo: url } })
    if (url === "/created") return json(201, { success: true, data: { id: 1 } })
    if (url === "/nocontent") {
      res.writeHead(204)
      return res.end()
    }
    if (url === "/missing")
      return json(404, {
        success: false,
        error: { code: "NOT_FOUND", message: "Nope" },
      })
    if (url === "/invalid")
      return json(422, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [
            { in: "body", path: "pincode", message: "We do not deliver here" },
          ],
        },
      })
    if (url === "/proxy") {
      res.writeHead(502, { "Content-Type": "text/html" })
      return res.end("<html><h1>502 Bad Gateway</h1></html>")
    }
    if (url === "/slow") return // never answers
    if (url === "/secure") {
      const ok = req.headers.authorization === "Bearer fresh"
      return ok
        ? json(200, { success: true, data: "secret" })
        : json(401, {
            success: false,
            error: { code: "TOKEN_EXPIRED", message: "expired" },
          })
    }
    json(404, { success: false, error: { code: "NOT_FOUND", message: "x" } })
  })
})
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
const port = (server.address() as AddressInfo).port
process.env.VITE_API_URL = `http://127.0.0.1:${port}`

const { api, configureApi } = await import("@/lib/api/client")
const { ApiError } = await import("@/lib/api/errors")

// success + query: undefined/null skipped, arrays repeated
const ok = await api<{ echo: string }>("/ok", {
  query: { page: 2, search: undefined, tag: ["a", "b"], none: null },
})
assert.equal(ok.echo, "/ok?page=2&tag=a&tag=b")
// path that already has a query string: `&` is used
assert.equal(
  (await api<{ echo: string }>("/ok?x=1", { query: { y: 2 } })).echo,
  "/ok?x=1&y=2"
)

// JSON body + 201
const created = await api<{ id: number }>("/created", {
  method: "POST",
  body: { a: 1 },
})
assert.equal(created.id, 1)
const last = requests.at(-1)!
assert.equal(last.method, "POST")
assert.equal(last.headers["content-type"], "application/json")
assert.equal(last.body, '{"a":1}')

// FormData is sent untouched: the browser/Node sets the multipart boundary itself
const form = new FormData()
form.set("file", new Blob(["x"]), "x.txt")
await api("/created", { method: "POST", body: form })
assert.match(
  String(requests.at(-1)!.headers["content-type"]),
  /^multipart\/form-data; boundary=/
)

// 204: no body, resolves to undefined
assert.equal(await api("/nocontent", { method: "DELETE" }), undefined)

// 4xx envelope becomes ApiError with status/code
await assert.rejects(api("/missing"), (e: unknown) => {
  assert.ok(e instanceof ApiError)
  assert.equal(e.status, 404)
  assert.equal(e.code, "NOT_FOUND")
  return true
})

// 422 exposes field details for form mapping
await assert.rejects(
  api("/invalid", { method: "POST", body: {} }),
  (e: unknown) => {
    assert.ok(e instanceof ApiError)
    assert.ok(e.isValidation)
    assert.deepEqual(e.fieldErrors, { pincode: "We do not deliver here" })
    return true
  }
)

// non-JSON 502 (proxy HTML) is an ApiError, not a JSON parse crash
await assert.rejects(api("/proxy"), (e: unknown) => {
  assert.ok(e instanceof ApiError)
  assert.equal(e.status, 502)
  assert.equal(e.code, "HTTP_ERROR")
  return true
})

// timeout: our own deadline, distinguishable code
await assert.rejects(api("/slow", { timeoutMs: 100 }), (e: unknown) => {
  assert.ok(e instanceof ApiError)
  assert.equal(e.code, "TIMEOUT")
  assert.ok(e.isTimeout)
  return true
})

// caller abort: NOT an ApiError (the UI ignores it)
const controller = new AbortController()
const pending = api("/slow", { signal: controller.signal })
setTimeout(() => controller.abort(), 50)
await assert.rejects(pending, (e: unknown) => {
  assert.ok(!(e instanceof ApiError), "abort must not become an ApiError")
  assert.equal((e as Error).name, "AbortError")
  return true
})

// auth: token attached only when asked; 401 -> onUnauthorized -> ONE retry
let token = "stale"
configureApi({
  getAccessToken: () => token,
  onUnauthorized: () => {
    tokenCalls++
    token = "fresh"
    return true
  },
})
assert.equal(await api("/secure", { auth: true }), "secret")
assert.equal(tokenCalls, 1)
await api("/ok")
assert.equal(
  requests.at(-1)!.headers.authorization,
  undefined,
  "no token unless auth: true"
)
// a refresh that does not help is NOT retried forever
configureApi({ getAccessToken: () => "stale", onUnauthorized: () => true })
await assert.rejects(
  api("/secure", { auth: true }),
  (e: unknown) => e instanceof ApiError && e.status === 401
)

// network failure: the server is gone
await new Promise<void>((r) => server.close(() => r()))
await assert.rejects(api("/ok"), (e: unknown) => {
  assert.ok(e instanceof ApiError)
  assert.equal(e.code, "NETWORK_ERROR")
  assert.ok(e.isNetwork)
  assert.match(e.message, /Cannot reach the server/)
  return true
})
console.log("15-api-client: all assertions passed")
process.exit(0)
