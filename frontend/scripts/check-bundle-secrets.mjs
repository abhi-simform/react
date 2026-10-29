// 14.2: greps the production bundle (build/client) for things that must never ship to a browser. Run by CI and
// available locally: `npm run build && npm run check:bundle-secrets`. Exit code 1 lists every hit.
// Principle: everything in build/client is public. Only `VITE_*` values reach it, and none of them is a secret,
// but a developer can still paste one into source by mistake, and a dependency can still bundle something odd.
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const root = path.resolve("build/client")

/** [label, regex]. Names of server secrets, credential shapes, and the dev password from the seed. */
const FORBIDDEN = [
  ["JWT secret variable", /JWT_(ACCESS|REFRESH)_SECRET/],
  ["Razorpay key secret", /RAZORPAY_(KEY|WEBHOOK)_SECRET/],
  ["Google client secret", /GOOGLE_CLIENT_SECRET/],
  ["Sentry auth token (variable)", /SENTRY_AUTH_TOKEN/],
  ["Sentry auth token (value)", /\bsntrys?_[A-Za-z0-9]{20,}/],
  ["MongoDB connection string", /mongodb(\+srv)?:\/\/[^\s"'`]*@/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Stripe-style secret key", /\bsk_(live|test)_[0-9A-Za-z]{16,}/],
  ["AWS access key id", /\bAKIA[0-9A-Z]{16}\b/],
  ["seed/dev password", /Password123/],
  ["Authorization header literal with a token", /Bearer\s+eyJ[A-Za-z0-9_-]{20,}/],
]

const TEXT = /\.(js|mjs|css|html|json|webmanifest|txt|xml|map|svg)$/

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) yield* walk(full)
    else yield full
  }
}

const problems = []
let scanned = 0
for (const file of walk(root)) {
  const rel = path.relative(root, file)
  // Public source maps expose the original source and comments: they go to Sentry and are deleted (14.6).
  if (file.endsWith(".map") && !process.env.ALLOW_PUBLIC_SOURCEMAPS)
    problems.push(`${rel}: a source map is served publicly (upload it to Sentry and delete it)`)
  if (!TEXT.test(file)) continue
  scanned++
  const text = readFileSync(file, "utf8")
  for (const [label, re] of FORBIDDEN) {
    const m = re.exec(text)
    if (m) problems.push(`${rel}: ${label} (${JSON.stringify(m[0].slice(0, 40))})`)
  }
}

if (problems.length) {
  console.error(`bundle secret scan FAILED (${problems.length}):\n- ${problems.join("\n- ")}`)
  process.exit(1)
}
console.log(`bundle secret scan: ${scanned} files in build/client, ${FORBIDDEN.length} patterns, nothing found`)
