import { execSync } from "node:child_process"
import path from "node:path"

/** Deterministic data: wipe and seed the dev database before the suite (12.6). */
export default function globalSetup() {
  if (process.env.E2E_SKIP_RESET) return
  execSync("npm run db:reset", {
    cwd: path.resolve(import.meta.dirname, "../../backend"),
    stdio: "inherit",
  })
}
