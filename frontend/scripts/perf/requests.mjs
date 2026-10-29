// 13.11: every API request the first seconds of a page load make: duplicates and waterfalls.
//   node scripts/perf/requests.mjs [path] [seconds] [signed-in]
// Prints each request with its start time (ms since navigation), status, cache source and, for duplicates, a count.
import { chromium } from "@playwright/test"

const path = process.argv[2] ?? "/"
const seconds = Number(process.argv[3] ?? 5)
const browser = await chromium.launch()
const context = await browser.newContext({
  serviceWorkers: "block",
  viewport: { width: 1280, height: 800 },
})
if (process.argv[4] === "signed-in") {
  const login = await context.request.post(
    "http://localhost:4000/api/v1/auth/login",
    { data: { email: "customer@shopsphere.dev", password: "Password123" } }
  )
  if (!login.ok()) throw new Error("login failed " + login.status())
  await context.addInitScript(() =>
    localStorage.setItem("shopsphere.hasSession", "true")
  )
}
const page = await context.newPage()
const rows = []
const t0 = { v: 0 }
page.on("request", (r) => {
  if (
    r.url().includes("/api/v1/") &&
    (r.method() === "GET" || r.method() === "POST")
  )
    rows.push({
      url: r.method() + " " + r.url().replace(/^.*\/api\/v1/, ""),
      start: Math.round(Date.now() - t0.v),
      status: "...",
      req: r,
    })
})
page.on("response", (res) => {
  const row = rows.find((x) => x.req === res.request())
  if (row) {
    row.status = res.status()
    row.fromCache = res.fromServiceWorker() ? "sw" : ""
    row.end = Math.round(Date.now() - t0.v)
  }
})
t0.v = Date.now()
await page.goto("http://localhost:5173" + path)
await page.waitForTimeout(seconds * 1000)
const counts = new Map()
for (const r of rows) counts.set(r.url, (counts.get(r.url) ?? 0) + 1)
console.log(`${rows.length} API GETs in ${seconds}s on ${path}`)
for (const r of rows)
  console.log(
    String(r.start).padStart(5),
    "->",
    String(r.end ?? "?").padStart(5),
    String(r.status).padStart(3),
    r.url,
    counts.get(r.url) > 1 ? ` (x${counts.get(r.url)})` : ""
  )
console.log(
  "duplicates:",
  [...counts].filter(([, n]) => n > 1).map(([u, n]) => `${u} x${n}`)
)
await browser.close()
