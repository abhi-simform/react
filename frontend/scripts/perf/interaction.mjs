// 13.1/13.2: measure INTERACTIONS in a real Chromium, with the CPU throttled like a mid-range phone.
//
//   node scripts/perf/interaction.mjs <scenario> [--cpu 4] [--base http://localhost:5173] [--cards 500]
//
// Scenarios: typing (type into the min-price box), scroll (scroll the listing), slider (drag the max-price
// slider with the keyboard while ~N cards are on screen), search (type in the header search).
// It reports what Lighthouse cannot: INP (the worst interaction: the time from input to the next paint),
// long tasks (>50 ms of main thread, i.e. jank) and, in a dev server, the React Profiler's commit counts
// and render time (window.__perf, filled by <PerfProfiler>).
//
// Run it against a PRODUCTION build (`npm run build && npm start`) for timings; against `npm run dev`
// for Profiler commit counts (a production build has the profiler compiled out).
import { chromium } from "@playwright/test"

const args = process.argv.slice(2)
const scenario = args[0] ?? "typing"
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const base = opt("base", "http://localhost:5173")
const cpu = Number(opt("cpu", 4))
const cards = Number(opt("cards", 500))

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
})
const page = await context.newPage()
await page.addInitScript(() => {
  const m = (window.__m = { events: [], longtasks: [], shifts: 0 })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      m.events.push({
        name: e.name,
        duration: e.duration,
        id: e.interactionId,
        start: e.startTime,
      })
  }).observe({ type: "event", durationThreshold: 16, buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      m.longtasks.push({ start: e.startTime, duration: e.duration })
  }).observe({ type: "longtask", buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      if (!e.hadRecentInput) m.shifts += e.value
  }).observe({ type: "layout-shift", buffered: true })
})

async function throttle(rate) {
  const cdp = await context.newCDPSession(page)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate })
}

async function loadCards(n) {
  // "Load more" mode: pages of 12 are appended until n cards are on screen.
  await page.goto(`${base}/products?mode=more`)
  const items = page.locator("main article")
  await items.first().waitFor()
  while ((await items.count()) < n) {
    const before = await items.count()
    await page.getByRole("button", { name: "Load more" }).click()
    await page.waitForFunction(
      ([sel, b]) => document.querySelectorAll(sel).length > b,
      ["main article", before]
    )
  }
  return items.count()
}

let shown = 0
if (scenario === "typing") {
  await page.goto(`${base}/products`)
  await page.locator("main article").first().waitFor()
} else if (scenario === "scroll") {
  await page.goto(`${base}/products?mode=more`)
  await page.locator("main article").first().waitFor()
} else if (scenario === "slider" || scenario === "search") {
  shown = await loadCards(cards)
}
await page.waitForTimeout(500)
await throttle(cpu)
await page.evaluate(() => {
  window.__m.events.length = 0
  window.__m.longtasks.length = 0
  window.__m.shifts = 0
  if (window.__perf) window.__perf.reset?.()
})

const t0 = Date.now()
if (scenario === "typing") {
  const min = page.getByLabel("Minimum price")
  await min.click()
  await min.pressSequentially("12345", { delay: 120 })
  await page.waitForTimeout(1200) // debounce + refetch
} else if (scenario === "scroll") {
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(800)
} else if (scenario === "slider") {
  const slider = page.getByRole("slider", { name: /maximum price/i })
  await slider.focus()
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("ArrowLeft")
    await page.waitForTimeout(40)
  }
  await page.waitForTimeout(1500)
} else if (scenario === "search") {
  const box = page.getByRole("combobox").first()
  await box.click()
  await box.pressSequentially("shirt", { delay: 120 })
  await page.waitForTimeout(1200)
}
const elapsed = Date.now() - t0

const m = await page.evaluate(() => ({
  events: window.__m.events,
  longtasks: window.__m.longtasks,
  shifts: window.__m.shifts,
  perf: window.__perf ? { ...window.__perf, reset: undefined } : null,
  nodes: document.getElementsByTagName("*").length,
  cards: document.querySelectorAll("main article").length,
}))
// INP = the worst interaction (fewer than 50 interactions: the highest one). An interaction's duration is
// the longest of its events (keydown / keyup / input ...).
const byId = new Map()
for (const e of m.events)
  if (e.id) byId.set(e.id, Math.max(byId.get(e.id) ?? 0, e.duration))
const durations = [...byId.values()].sort((a, b) => b - a)
const lt = m.longtasks.map((t) => t.duration).sort((a, b) => b - a)
console.log(
  JSON.stringify(
    {
      scenario,
      cpuThrottle: cpu,
      cardsOnScreen: m.cards,
      domNodes: m.nodes,
      interactions: durations.length,
      inpMs: Math.round(durations[0] ?? 0),
      medianInteractionMs: Math.round(
        durations[Math.floor(durations.length / 2)] ?? 0
      ),
      longTasks: lt.length,
      longTaskTotalMs: Math.round(lt.reduce((a, b) => a + b, 0)),
      longestTaskMs: Math.round(lt[0] ?? 0),
      cls: Number(m.shifts.toFixed(4)),
      profiler: m.perf,
      scenarioMs: elapsed,
    },
    null,
    1
  )
)
await browser.close()
