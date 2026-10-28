// 13.10/13.11: how fast is the SECOND visit on a slow network, with and without the service worker?
//   node scripts/perf/repeat-visit.mjs [path]
// Slow 4G (1.6 Mbps, 150 ms RTT) via CDP, 4x CPU, three runs each; reports the median LCP, bytes that hit the
// network, and how many requests were answered by the service worker / the HTTP cache.
import { chromium } from "@playwright/test"

const base = "http://localhost:5173"
const path = process.argv[2] ?? "/products"

async function once(serviceWorkers) {
  const browser = await chromium.launch()
  const context = await browser.newContext({ serviceWorkers })
  const page = await context.newPage()
  // first visit (fills caches), unthrottled
  await page.goto(base + path, { waitUntil: "networkidle" })
  if (serviceWorkers === "allow") {
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload({ waitUntil: "networkidle" }) // now controlled
  }
  const cdp = await context.newCDPSession(page)
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  let net = 0,
    sw = 0,
    total = 0
  page.on("response", (r) => {
    total++
    if (r.fromServiceWorker()) sw++
  })
  cdp.on("Network.loadingFinished", (e) => (net += e.encodedDataLength))
  await page.addInitScript(() => {
    window.__lcp = 0
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = e.startTime
    }).observe({ type: "largest-contentful-paint", buffered: true })
  })
  const t0 = Date.now()
  await page.goto(base + path, { waitUntil: "networkidle" })
  const wall = Date.now() - t0
  const lcp = await page.evaluate(() => Math.round(window.__lcp))
  await browser.close()
  return {
    lcp,
    wall,
    kbNetwork: Math.round(net / 1024),
    requests: total,
    fromSw: sw,
  }
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
for (const mode of ["block", "allow"]) {
  const runs = []
  for (let i = 0; i < 3; i++) runs.push(await once(mode))
  console.log(
    `${mode === "allow" ? "with service worker" : "no service worker  "}: LCP ${median(runs.map((r) => r.lcp))} ms, load-to-idle ${median(runs.map((r) => r.wall))} ms, ${median(runs.map((r) => r.kbNetwork))} kB over the network, ${runs[0].requests} responses of which ${median(runs.map((r) => r.fromSw))} from the service worker`
  )
}
