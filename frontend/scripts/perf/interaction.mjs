// 13.1/13.2: measure INTERACTIONS in a real Chromium, with the CPU throttled like a mid-range phone.
//
//   node scripts/perf/interaction.mjs <scenario> [--cpu 4] [--base http://localhost:5173] [--cards 500]
//
// Scenarios: notifications (the 2,000-row history: DOM size and scroll smoothness), typing (type into the min-price box), scroll (scroll the listing), slider (drag the price-ceiling
// slider with the keyboard), filter (type in the quick filter while ~N cards are on screen).
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
// The seed has 308 products, so ~300 is the most the real catalog can put on screen.
const cards = Number(opt("cards", 300))

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
})
const page = await context.newPage()
await page.addInitScript(() => {
  const m = (window.__m = {
    events: [],
    longtasks: [],
    shifts: 0,
    culprits: [],
  })
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

// How many products are LOADED (not necessarily in the DOM: the feed is virtualised): the list items carry
// aria-setsize = the number of items in the whole list.
const loadedCount = () =>
  page.evaluate(() =>
    Number(
      document
        .querySelector("main [role=listitem]")
        ?.getAttribute("aria-setsize") ??
        document.querySelectorAll("main article").length
    )
  )

async function loadCards(n) {
  // "Load more" mode: pages of 12 are appended until n cards are loaded (or there are no more).
  await page.goto(`${base}/products?mode=more`)
  await page.locator("main article").first().waitFor()
  for (let guard = 0; guard < 120; guard++) {
    const before = await loadedCount()
    if (before >= n) break
    const more = page.getByRole("button", { name: "Load more" })
    if (!(await more.isVisible().catch(() => false))) {
      // Virtual feed: the button is far below. Scroll to the end so the sentinel loads the next page.
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight)
      )
      await page.waitForTimeout(250)
      if (
        (await loadedCount()) === before &&
        !(await more.isVisible().catch(() => false))
      )
        break
      continue
    }
    await more.click({ timeout: 2000 }).catch(() => undefined)
    await page
      .waitForFunction(
        (b) =>
          Number(
            document
              .querySelector("main [role=listitem]")
              ?.getAttribute("aria-setsize") ??
              document.querySelectorAll("main article").length
          ) > b,
        before,
        { timeout: 5000 }
      )
      .catch(() => undefined)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  return loadedCount()
}

let shown = 0
if (scenario === "motion") {
  // `motion [--reduced]`: add a product to the cart (fly-to-cart + badge bump + toast), then remove a line on the
  // cart page (AnimatePresence + layout). Frames sampled with requestAnimationFrame at the throttled CPU.
  if (args.includes("--reduced"))
    await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`${base}/products`)
  await page.locator("main article").first().waitFor()
  await page.addInitScript(() => {})
}
if (scenario === "page") {
  // `page <path>`: load a page and report layout shifts (CLS) with the elements that moved.
  await page.goto(base + (args[1] ?? "/"), { waitUntil: "networkidle" })
  await page.waitForTimeout(1500)
}
if (scenario === "notifications" || scenario === "feed") {
  // Signed in the way the e2e suite does it: log in through the API in this context, then hint the app.
  const login = await context.request.post(
    base.replace(":5173", ":4000") + "/api/v1/auth/login",
    {
      data: { email: "customer@shopsphere.dev", password: "Password123" },
    }
  )
  if (!login.ok()) throw new Error("login failed " + login.status())
  await context.addInitScript(() =>
    localStorage.setItem("shopsphere.hasSession", "true")
  )
}
if (scenario === "notifications") {
  await page.goto(`${base}/account/notifications`)
  await page.locator("[data-testid=notification]").first().waitFor()
  // Pull the whole history in: "Load more" while the button exists, otherwise scroll down (the virtual list
  // loads the next page when its last rows come into view). Stops when "Loaded N of N" says everything is here.
  for (let i = 0; i < 400; i++) {
    const [loaded, total] = (
      (await page.getByTestId("notification-count").textContent()) ?? ""
    )
      .replaceAll(",", "")
      .match(/\d+/g)
      .map(Number)
    shown = total
    if (loaded >= total) break
    const more = page.getByRole("button", { name: "Load more" })
    // (A virtual list keeps moving while rows are measured, so a click can fail the stability check: scroll instead.)
    const clicked = (await more.isVisible().catch(() => false))
      ? await more.click({ timeout: 800 }).then(
          () => true,
          () => false
        )
      : false
    if (!clicked)
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight)
      )
    await page.waitForTimeout(clicked ? 40 : 150)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
} else if (scenario === "typing") {
  await page.goto(`${base}/products`)
  await page.locator("main article").first().waitFor()
} else if (scenario === "scroll") {
  await page.goto(`${base}/products?mode=more`)
  await page.locator("main article").first().waitFor()
} else if (scenario === "slider" || scenario === "filter") {
  shown = await loadCards(cards)
}
const domNodesBefore = await page.evaluate(
  () => document.getElementsByTagName("*").length
)
await page.waitForTimeout(500)
await throttle(cpu)
await page.evaluate((keepShifts) => {
  window.__m.events.length = 0
  window.__m.longtasks.length = 0
  if (!keepShifts) ((window.__m.shifts = 0), (window.__m.culprits.length = 0))
  if (window.__perf) window.__perf.reset?.()
}, scenario === "page")

let productRequests = 0
page.on("request", (r) => {
  if (/\/api\/v1\/products(\?|$)/.test(r.url())) productRequests++
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
  // A real drag with the mouse: 25 pointer moves from the right end to ~40% of the track, then release.
  const slider = page.locator("input[type=range]")
  await slider.scrollIntoViewIfNeeded()
  const box = await slider.boundingBox()
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width - 4, y)
  await page.mouse.down()
  for (let i = 1; i <= 25; i++) {
    await page.mouse.move(box.x + box.width - 4 - (box.width * 0.6 * i) / 25, y)
    await page.waitForTimeout(40)
  }
  await page.mouse.up()
  await page.waitForTimeout(1500)
} else if (scenario === "notifications") {
  // Scroll top to bottom and back in 60 wheel ticks while sampling every animation frame.
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const tick = (now) => {
      window.__frames.push(now - last)
      last = now
      window.__raf = requestAnimationFrame(tick)
    }
    window.__raf = requestAnimationFrame(tick)
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(30)
  }
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, -900)
    await page.waitForTimeout(30)
  }
  await page.evaluate(() => cancelAnimationFrame(window.__raf))
  // One state change with the whole history loaded: mark the first unread row as read (the list re-renders).
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.getByRole("button", { name: "Mark read" }).first().click()
  await page.waitForTimeout(600)
} else if (scenario === "motion") {
  const sample = () =>
    page.evaluate(() => {
      window.__frames = []
      window.__flies = 0
      new MutationObserver((muts) => {
        for (const m of muts)
          for (const n of m.addedNodes) if (n.dataset?.fly) window.__flies++
      }).observe(document.body, { childList: true })
      let last = performance.now()
      const tick = (now) => {
        window.__frames.push(now - last)
        last = now
        window.__raf = requestAnimationFrame(tick)
      }
      window.__raf = requestAnimationFrame(tick)
    })
  await sample()
  const t1 = Date.now()
  await page.getByRole("button", { name: "Add to cart" }).first().click()
  await page.getByText("Added to cart").first().waitFor()
  const toastMs = Date.now() - t1
  await page.waitForTimeout(1000)
  const flies = await page.evaluate(() => window.__flies)
  const flyFrames = await page.evaluate(() => {
    const f = window.__frames
    return {
      count: f.length,
      avgMs: +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1),
      p95Ms: Math.round(
        [...f].sort((a, b) => a - b)[Math.floor(f.length * 0.95)]
      ),
      over33ms: f.filter((x) => x > 33).length,
    }
  })
  const bumped = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector("[data-testid=cart-badge]"))
        .animationName
  )
  // The cart page: add a second product so that removing one makes the other glide up.
  await page.getByRole("button", { name: "Add to cart" }).nth(1).click()
  await page.waitForTimeout(1200)
  await page
    .getByRole("link", { name: /cart/i })
    .first()
    .click()
    .catch(() => undefined)
  await page.goto(`${base}/cart`)
  await page
    .getByRole("button", { name: /remove/i })
    .first()
    .waitFor()
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const tick = (now) => {
      window.__frames.push(now - last)
      last = now
      window.__raf = requestAnimationFrame(tick)
    }
    window.__raf = requestAnimationFrame(tick)
  })
  await page
    .getByRole("button", { name: /remove/i })
    .first()
    .click()
  await page.waitForTimeout(900)
  await page.evaluate(() => cancelAnimationFrame(window.__raf))
  console.log(
    JSON.stringify({
      toastVisibleAfterMs: toastMs,
      flyClonesCreated: flies,
      badgeAnimationName: bumped,
      flyFrames,
    })
  )
} else if (scenario === "filter") {
  // The client-side quick filter over the loaded cards: every keystroke re-filters and re-renders them.
  const box = page.getByLabel("Filter loaded products")
  await box.click()
  await box.pressSequentially("shirt slim", { delay: 120 })
  await page.waitForTimeout(1200)
}
const elapsed = Date.now() - t0

const m = await page.evaluate(() => ({
  events: window.__m.events,
  longtasks: window.__m.longtasks,
  shifts: window.__m.shifts,
  culprits: (window.__m.culprits ?? [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 3),
  perf: window.__perf ? { ...window.__perf, reset: undefined } : null,
  nodes: document.getElementsByTagName("*").length,
  cards: document.querySelectorAll("main article").length,
  loaded: Number(
    document
      .querySelector("main [role=listitem]")
      ?.getAttribute("aria-setsize") ??
      document.querySelectorAll("main article").length
  ),
  heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576),
  rows: document.querySelectorAll("[data-testid=notification]").length,
  frames: window.__frames ?? null,
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
      notificationRowsInDom: m.rows,
      heapMB: m.heapMB,
      frames: m.frames
        ? {
            count: m.frames.length,
            avgMs: Number(
              (m.frames.reduce((a, b) => a + b, 0) / m.frames.length).toFixed(1)
            ),
            p95Ms: Math.round(
              [...m.frames].sort((a, b) => a - b)[
                Math.floor(m.frames.length * 0.95)
              ]
            ),
            over50ms: m.frames.filter((f) => f > 50).length,
          }
        : undefined,
      cardsLoadedBeforeInteraction: shown || m.loaded,
      cardsInDomAfter: m.cards,
      cardsLoadedAfter: m.loaded,
      domNodesBeforeInteraction: domNodesBefore,
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
      shiftCulprits: m.culprits.map((c) => `${c.value.toFixed(3)} ${c.node}`),
      profiler: m.perf,
      productListRequests: productRequests,
      scenarioMs: elapsed,
    },
    null,
    1
  )
)
await browser.close()
