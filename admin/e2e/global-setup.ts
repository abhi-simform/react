import { execSync } from "node:child_process"
import path from "node:path"

import { chromium } from "@playwright/test"

/**
 * Deterministic data: wipe and seed the dev database, then touch the admin's routes once so Vite's on-demand
 * dependency optimisation (which reloads the page mid-test) has finished before the first spec.
 */
export default async function globalSetup() {
  if (!process.env.E2E_SKIP_RESET) {
    execSync("npm run db:reset", {
      cwd: path.resolve(import.meta.dirname, "../../backend"),
      stdio: "inherit",
    })
  }
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const route of ["/login", "/forbidden"])
    await page.goto(`http://localhost:3000${route}`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    })
  await browser.close()
}
