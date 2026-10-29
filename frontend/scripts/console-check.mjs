// 14.9: release check "no console errors": load the main routes of the PRODUCTION build in Chromium (guest, then
// signed in as the seeded customer) and fail on any console error/warning, uncaught exception, CSP violation or
// failed API request (4xx on purpose are listed in EXPECTED).
//   (backend on :4000, `npm start` on :5173)   node scripts/console-check.mjs [--base http://localhost:5173]
import { chromium } from "@playwright/test"

const base = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:5173"
const SLUG = "the-ordinary-j63-night-cream-ski-00200"
const guest = [
  "/",
  "/products",
  "/products?search=cream&sort=price_asc",
  `/p/${SLUG}`,
  "/c/electronics",
  "/cart",
  "/deals",
  "/compare",
  "/help",
  "/policies/privacy",
  "/policies/returns",
  "/policies/terms",
  "/login",
  "/register",
  "/forgot-password",
  "/offline",
  "/no-such-page",
]
const signedIn = [
  "/orders",
  "/wishlist",
  "/account",
  "/account/profile",
  "/account/addresses",
  "/account/security",
  "/account/notifications",
  "/checkout",
]
// A 401 from the silent session refresh of a guest is the app working. (A missing PRODUCT is not listed: React Router
// logs the NotFoundError it catches in an error boundary by design, which is not a bug and would fail this check.)
// The web-vitals beacon (`/metrics/vitals`) is rate limited by the API on purpose (telemetry must never be able to
// hammer it): 25 page loads in a minute from one IP exceed that, a real visitor does not.
const EXPECTED = [/\/auth\/refresh/, /\/metrics\/vitals/]
// The Sentry lab page is not part of a normal visit; the service worker is blocked so request logs stay about the app.
const browser = await chromium.launch()
let failures = 0
async function visit(context, label, routes) {
  for (const route of routes) {
    const page = await context.newPage()
    const problems = []
    page.on("console", (m) => {
      if (!["error", "warning"].includes(m.type())) return
      const text = m.text()
      if (
        /Failed to load resource/.test(text) &&
        EXPECTED.some((re) => re.test(m.location().url ?? ""))
      )
        return
      if (/Service Worker registration blocked/.test(text)) return
      problems.push(`${m.type()}: ${text.slice(0, 160)}`)
    })
    page.on("pageerror", (e) =>
      problems.push(`exception: ${e.message.slice(0, 160)}`)
    )
    page.on("response", (r) => {
      if (
        r.url().includes("/api/v1/") &&
        r.status() >= 400 &&
        !EXPECTED.some((re) => re.test(r.url()))
      )
        problems.push(
          `HTTP ${r.status()} ${r.url().replace(/^.*\/api\/v1/, "")}`
        )
    })
    await page.goto(base + route, { waitUntil: "networkidle" })
    await page.waitForTimeout(600)
    await page.close()
    if (problems.length) failures++
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${label} ${route}${problems.length ? "\n      " + [...new Set(problems)].join("\n      ") : ""}`
    )
  }
}
const g = await browser.newContext({ serviceWorkers: "block" })
await visit(g, "guest ", guest)
await g.close()
const s = await browser.newContext({ serviceWorkers: "block" })
const login = await s.newPage()
await login.goto(base + "/login", { waitUntil: "networkidle" })
await login.getByLabel("Email").fill("customer@shopsphere.dev")
await login
  .getByLabel("Password")
  .fill(process.env.SEED_PASSWORD ?? "Password123")
await login
  .getByRole("button", { name: /log in/i })
  .first()
  .click()
await login.waitForURL((u) => !u.pathname.startsWith("/login"))
await login.close()
await visit(s, "member", signedIn)
await browser.close()
console.log(
  failures
    ? `\n${failures} page(s) with console problems`
    : `\nno console problems on ${guest.length + signedIn.length} pages`
)
process.exit(failures ? 1 : 0)
