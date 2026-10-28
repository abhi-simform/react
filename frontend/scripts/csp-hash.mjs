// Prints the CSP hash of the inline theme script (13.7). Paste it into public/_headers when the script changes:
//   node scripts/csp-hash.mjs
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const src = readFileSync(
  new URL("../app/features/theme/themeScript.ts", import.meta.url),
  "utf8"
)
const m = /export const themeInitScript = `([^`]*)`/.exec(src)
if (!m) throw new Error("themeInitScript not found")
const body = m[1].replaceAll("${THEME_STORAGE_KEY}", "shopsphere.theme")
console.log(`'sha256-${createHash("sha256").update(body).digest("base64")}'`)
