import { execSync } from "node:child_process"
import path from "node:path"

import { chromium, type FullConfig } from "@playwright/test"

/**
 * Deterministic data (12.6): wipe and seed the dev database before the suite. Then warm the Vite
 * dev server: its FIRST page load optimises dependencies and reloads the page, which takes longer
 * than an assertion timeout and made whichever test ran first fail.
 */
export default async function globalSetup(config: FullConfig) {
  if (!process.env.E2E_SKIP_RESET) {
    execSync("npm run db:reset", {
      cwd: path.resolve(import.meta.dirname, "../../backend"),
      stdio: "inherit",
    })
  }
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:5173"
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const route of ["/", "/products", "/login", "/cart"]) {
    await page.goto(baseURL + route, {
      waitUntil: "networkidle",
      timeout: 120_000,
    })
  }
  await browser.close()
}
