// `npm install` runs this (the "prepare" script): point git at the committed hooks (.githooks) so the
// pre-commit check (lint-staged) works for everyone without a manual step. Silent no-op outside a
// git checkout (Docker builds, CI installs of a tarball).
import { execSync } from "node:child_process"
import { existsSync } from "node:fs"

try {
  const root = execSync("git rev-parse --show-toplevel", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim()
  const prefix = execSync("git rev-parse --show-prefix", {
    stdio: ["ignore", "pipe", "ignore"],
  })
    .toString()
    .trim() // "frontend/"
  if (existsSync(".githooks/pre-commit")) {
    execSync(`git config core.hooksPath ${prefix}.githooks`, {
      cwd: root,
      stdio: "ignore",
    })
  }
} catch {
  /* not a git checkout */
}
