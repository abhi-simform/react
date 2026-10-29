// 13.11: what do the HTTP cache headers buy? Browse the same pages twice and count how every API GET was answered:
//   disk cache (no request at all), 304 (a conditional request, no body) or 200 (full download).
//   node scripts/perf/http-cache.mjs
// Full navigations in one browser context share the HTTP cache. Needs the "before" stack (see below) running.
import { chromium } from "@playwright/test"

const base = "http://localhost:5173"
const PAGES = [
  "/",
  "/products",
  "/p/the-ordinary-j63-night-cream-ski-00200",
  "/",
  "/products",
  "/p/the-ordinary-j63-night-cream-ski-00200",
]

async function run(site) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers: "block" })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send("Network.enable")
  const byId = new Map()
  const tally = { disk: 0, 304: 0, 200: 0, bytes: 0, requests: 0, urls: {} }
  cdp.on("Network.requestWillBeSent", (e) => {
    if (e.request.url.includes("/api/v1/") && e.request.method === "GET")
      byId.set(e.requestId, e.request.url)
  })
  cdp.on("Network.responseReceived", (e) => {
    if (!byId.has(e.requestId)) return
    tally.requests++
    const key = byId
      .get(e.requestId)
      .replace(/^.*\/api\/v1/, "")
      .replace(/[?].*/, "")
    tally.urls[key] = (tally.urls[key] ?? 0) + 1
    if (e.response.fromDiskCache) tally.disk++
    else if (e.response.status === 304) tally[304]++
    else tally[200]++
  })
  cdp.on("Network.loadingFinished", (e) => {
    if (byId.has(e.requestId)) tally.bytes += e.encodedDataLength
  })
  for (const p of PAGES) await page.goto(site + p, { waitUntil: "networkidle" })
  await browser.close()
  return tally
}
// Run it twice, once per stack, on the SAME origin (:5173; CORS allows it) with the label as the argument:
//   (frontend build against the pre-B12 API on :4001, served on :5173)   node scripts/perf/http-cache.mjs "before B12"
//   (the real app and API)                                               node scripts/perf/http-cache.mjs "after B12"
const label = process.argv[2] ?? "this stack"
const t = await run(base)
if (process.env.VERBOSE) console.log(t.urls)
console.log(
  `${label}: ${t.requests} API GETs over ${PAGES.length} page loads -> disk cache ${t.disk}, 304 revalidations ${t[304]}, full 200s ${t[200]}, ${(t.bytes / 1024).toFixed(1)} kB over the network`
)
