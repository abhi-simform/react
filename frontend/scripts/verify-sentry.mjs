// 14.6: proves the error pipeline end to end WITHOUT a Sentry account, against a local fake ingest endpoint.
//   (backend running on :4000, port 5173 and 9999 free)   npm run verify:sentry
// What it does:
//   1. starts a fake Sentry (POST /api/1/envelope/ stores the envelope; other API calls answer 404)
//   2. builds the storefront WITH a DSN pointing at it, a release name and an auth token (so the real source map upload
//      code runs: it fails against the fake, which is expected and must not be fatal locally)
//   3. serves that build, signs in as the seeded customer in a real browser, clicks the buttons of /debug/sentry
//   4. asserts what arrived: release, environment, tags (request id), breadcrumbs, user id only, no PII, and that a
//      minified frame maps back to the original source through the source map
//   5. rebuilds the normal build (no DSN) so the working tree's build output is the usual one
import { spawn } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { gunzipSync, inflateSync } from "node:zlib"

import { chromium } from "@playwright/test"
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping"

const RELEASE = `verify-${Date.now()}`
const envelopes = []
let uploadCalls = 0

const fake = createServer((req, res) => {
  const chunks = []
  req.on("data", (c) => chunks.push(c))
  req.on("end", () => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
    }
    if (req.method === "OPTIONS") return void res.writeHead(204, cors).end()
    if (req.url?.startsWith("/api/1/envelope")) {
      let body = Buffer.concat(chunks)
      try {
        body = gunzipSync(body)
      } catch {
        try {
          body = inflateSync(body)
        } catch {
          /* plain text */
        }
      }
      envelopes.push(body.toString("utf8"))
      return void res
        .writeHead(200, { ...cors, "content-type": "application/json" })
        .end("{}")
    }
    uploadCalls++ // the bundler plugin talking to "Sentry" (release + chunk upload)
    res
      .writeHead(404, { ...cors, "content-type": "application/json" })
      .end("{}")
  })
}).listen(9999)

const buildEnv = {
  ...process.env,
  VITE_SENTRY_DSN: "http://pubkey@localhost:9999/1",
  VITE_RELEASE: RELEASE,
  VITE_ENVIRONMENT: "verify",
  SENTRY_AUTH_TOKEN: "fake-token-for-verification",
  SENTRY_ORG: "org",
  SENTRY_PROJECT: "proj",
  SENTRY_URL: "http://localhost:9999",
  SENTRY_KEEP_MAPS: "1",
}
console.log(`> building with a DSN, release ${RELEASE}`)
// Async on purpose: the fake Sentry lives in THIS process and must answer the plugin while the build runs.
const run = (env) =>
  new Promise((resolve) => {
    const child = spawn("npm", ["run", "build"], { env })
    let out = ""
    child.stdout.on("data", (d) => (out += d))
    child.stderr.on("data", (d) => (out += d))
    child.on("close", (status) => resolve({ status, out }))
  })
const build = await run(buildEnv)
if (build.status !== 0) throw new Error(`build failed\n${build.out}`)
console.log(
  `  plugin upload calls reaching the fake Sentry: ${uploadCalls} (it tried: release + chunk upload)`
)

// A copy of what the browser can fetch: the maps are NOT public in a real build (they are deleted after upload).
const maps = new Map()
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (full.endsWith(".js.map"))
      maps.set(path.basename(full, ".map"), readFileSync(full, "utf8"))
  }
}
walk("build/client")
console.log(
  `  ${maps.size} source maps produced (hidden: no sourceMappingURL in the files)`
)

const server = spawn("node", ["scripts/serve-spa.mjs"], {
  env: { ...process.env, PORT: "5173" },
  stdio: "ignore",
})
await new Promise((r) => setTimeout(r, 1000))

const results = []
const check = (name, ok, detail = "") => {
  results.push(ok)
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`
  )
}

const browser = await chromium.launch()
let apiRequestId = ""
try {
  const page = await browser.newPage()
  page.on("response", (res) => {
    if (res.url().includes("/products/this-slug-does-not-exist"))
      apiRequestId = res.headers()["x-request-id"] ?? ""
  })
  // sign in as the seeded customer (real API)
  await page.goto("http://localhost:5173/login")
  await page.getByLabel("Email").fill("customer@shopsphere.dev")
  await page
    .getByLabel("Password")
    .fill(process.env.SEED_PASSWORD ?? "Password123")
  await page
    .getByRole("button", { name: /log in|sign in/i })
    .first()
    .click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 15_000,
  })
  await page.waitForLoadState("load")
  await page.waitForTimeout(1500) // SDK loads after `load`

  await page.goto("http://localhost:5173/debug/sentry")
  await page.waitForTimeout(1500)
  await page.getByRole("button", { name: /event handler/i }).click()
  await page.getByRole("button", { name: /unhandled promise/i }).click()
  await page.getByRole("button", { name: /failed api call/i }).click()
  await page.getByRole("button", { name: /full of PII/i }).click()
  await page.getByRole("button", { name: /during render/i }).click()
  await page.waitForTimeout(2500)
  // a page hide flushes pending vitals / transport
  await page.goto("about:blank")
  await page.waitForTimeout(1500)
} finally {
  await browser.close()
  server.kill()
  fake.close()
}

// ---- assertions on what the fake Sentry received --------------------------------------------------------------
const items = envelopes.flatMap((e) => {
  const lines = e.split("\n")
  const out = []
  for (let i = 1; i < lines.length - 1; i += 2) {
    try {
      out.push({
        header: JSON.parse(lines[i]),
        payload: JSON.parse(lines[i + 1]),
      })
    } catch {
      /* binary item */
    }
  }
  return out
})
const events = items
  .filter((i) => i.header.type === "event")
  .map((i) => i.payload)
const all = envelopes.join("\n")
for (const e of events)
  console.log(
    `  event ${e.tags?.context}: ${(e.breadcrumbs ?? []).map((b) => b.category).join(",")}`
  )
console.log(
  `> ${envelopes.length} envelopes, ${events.length} error events, item types: ${[...new Set(items.map((i) => i.header.type))].join(", ")}`
)

const byMessage = (re) =>
  events.find((e) => re.test(JSON.stringify(e.exception ?? e.message)))
const handler = byMessage(/event-handler/)
const rejection = byMessage(/unhandled rejection/)
const render = byMessage(/render error/)
const api = events.find((e) => e.tags?.context === "dev:failed-api-call")
const pii = events.find((e) => e.tags?.context === "dev:pii-probe")

check("event-handler error arrived (window.onerror path)", Boolean(handler))
check("unhandled rejection arrived", Boolean(rejection))
check("render error arrived from the route boundary", Boolean(render))
check(
  "release tag",
  events.every((e) => e.release === RELEASE),
  RELEASE
)
check(
  "environment tag",
  events.every((e) => e.environment === "verify")
)
check(
  "user is the id only",
  events.every((e) => !e.user || Object.keys(e.user).join() === "id"),
  JSON.stringify(events[0]?.user)
)
check(
  "a signed-in user id is present",
  events.some((e) => typeof e.user?.id === "string" && e.user.id.length > 5)
)
check(
  "API failure carries the request id that the server returned",
  Boolean(api && apiRequestId && api.tags?.request_id === apiRequestId),
  `${api?.tags?.request_id} vs response header ${apiRequestId}`
)
check(
  "breadcrumbs include clicks and fetches",
  (() => {
    const cats = new Set((api?.breadcrumbs ?? []).map((b) => b.category))
    return cats.has("ui.click") && (cats.has("fetch") || cats.has("xhr"))
  })(),
  [...new Set((api?.breadcrumbs ?? []).map((b) => b.category))].join(",")
)
check(
  "PII probe arrived scrubbed",
  Boolean(pii) &&
    /\[email\]/.test(JSON.stringify(pii)) &&
    /\[token\]/.test(JSON.stringify(pii))
)
for (const leak of [
  "customer@shopsphere.dev",
  "eyJhbGci",
  "SECRET123",
  "token=SECRET",
  "Password123",
])
  check(`nothing sent contains "${leak}"`, !all.includes(leak))
check(
  "no query string survives in breadcrumb or request URLs",
  !/"(url|to|from)":"[^"]*\?[^"]/.test(all)
)

// source map: a minified frame -> original file and line
const frame = (
  render?.exception?.values?.[0]?.stacktrace?.frames ??
  handler?.exception?.values?.[0]?.stacktrace?.frames ??
  []
)
  .filter((f) => f.filename?.includes("/assets/") && f.lineno)
  .at(-1)
if (!frame) check("a minified in-app frame exists", false)
else {
  const file = path.basename(new URL(frame.filename, "http://x").pathname)
  const map = maps.get(file)
  const pos = map
    ? originalPositionFor(new TraceMap(map), {
        line: frame.lineno,
        column: (frame.colno ?? 1) - 1,
      })
    : null
  console.log(
    `  minified: ${file}:${frame.lineno}:${frame.colno}  ->  original: ${pos?.source}:${pos?.line}`
  )
  check(
    "the source map resolves the frame to a file under app/",
    Boolean(pos?.source && /app\//.test(pos.source))
  )
}

console.log("> restoring the normal build")
await run({ ...process.env, VITE_SENTRY_DSN: "", SENTRY_AUTH_TOKEN: "" })
const failed = results.filter((r) => !r).length
console.log(
  failed
    ? `\n${failed} check(s) FAILED`
    : `\nall ${results.length} checks passed`
)
process.exit(failed ? 1 : 0)
