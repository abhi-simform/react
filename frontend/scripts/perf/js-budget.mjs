// 13.3: how much JavaScript does each page download? (compressed bytes on the wire, from the real browser)
//   node scripts/perf/js-budget.mjs [--base http://localhost:5173] [--slug <product-slug>] [--check]
// `--check` exits 1 when a page is over its budget (kB gzip of JS during load, before any interaction).
import { chromium } from "@playwright/test"

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const base = opt("base", "http://localhost:5173")
const slug = opt("slug", "the-ordinary-j63-night-cream-ski-00200")
// Budgets (kB gzip of JS requested while loading the page): the measured size after 13.3 plus ~4% headroom.
// A regression guard, not a goal: see docs/perf-log.md for where the bytes are and what was tried.
const BUDGET = { "/": 335, "/products": 330, [`/p/${slug}`]: 360, "/cart": 345 }

const browser = await chromium.launch()
let failed = false
console.log("page".padEnd(46), "JS kB (gzip)", "files", "budget")
for (const path of Object.keys(BUDGET)) {
  const context = await browser.newContext()
  const page = await context.newPage()
  let bytes = 0
  let files = 0
  const pending = []
  page.on("response", (res) => {
    if (res.request().resourceType() !== "script") return
    pending.push(
      res
        .request()
        .sizes()
        .then((s) => {
          bytes += s.responseBodySize
          files++
        })
        .catch(() => undefined)
    )
  })
  await page.goto(base + path, { waitUntil: "networkidle" })
  await Promise.all(pending)
  const kb = Math.round(bytes / 1024)
  const over = kb > BUDGET[path]
  failed ||= over
  console.log(
    path.padEnd(46),
    String(kb).padStart(12),
    String(files).padStart(5),
    `${BUDGET[path]}${over ? "  OVER" : ""}`
  )
  await context.close()
}
await browser.close()
if (failed && args.includes("--check")) process.exit(1)
