// 14.8 (experiment): load routes against the SSR server in Chromium and report hydration problems.
//   node scripts/ssr-check.mjs [--base http://localhost:5173]
// React logs hydration mismatches as console errors: "Hydration failed", "Minified React error #418/#423/#425".
import { chromium } from "@playwright/test"

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:5173"
const SLUG = "the-ordinary-j63-night-cream-ski-00200"
const routes = [
  "/",
  "/products",
  "/products?search=cream",
  `/p/${SLUG}`,
  "/c/electronics",
  "/cart",
  "/login",
  "/deals",
  "/help",
  "/policies/privacy",
  "/compare",
  "/offline",
  "/nope",
]
const browser = await chromium.launch()
let bad = 0
// Visitors whose stored preferences differ from what the server rendered (the server cannot see localStorage).
const PREFS = {
  "en-US": null,
  "hi-IN": null,
  "stored: dark + USD + Hindi": {
    theme: "dark",
    locale: { language: "hi", currency: "USD" },
  },
}
for (const [lang, prefs] of Object.entries(PREFS)) {
  for (const route of routes) {
    const context = await browser.newContext({
      locale: lang.startsWith("stored") ? "en-US" : lang,
      serviceWorkers: "block",
    })
    if (prefs)
      await context.addInitScript((p) => {
        localStorage.setItem("shopsphere.theme", JSON.stringify(p.theme))
        localStorage.setItem("shopsphere.locale", JSON.stringify(p.locale))
      }, prefs)
    const page = await context.newPage()
    const problems = []
    page.on("console", (m) => {
      if (
        ["error", "warning"].includes(m.type()) &&
        !/Failed to load resource|Service Worker registration blocked/.test(
          m.text()
        )
      )
        problems.push(`${m.type()}: ${m.text().slice(0, 160)}`)
    })
    page.on("pageerror", (e) =>
      problems.push(`pageerror: ${e.message.slice(0, 160)}`)
    )
    await page.goto(base + route, { waitUntil: "networkidle" })
    await context.close()
    if (problems.length) bad++
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${lang} ${route}${problems.length ? "\n      " + [...new Set(problems)].join("\n      ") : ""}`
    )
  }
}
await browser.close()
process.exit(bad ? 1 : 0)
