// 14.2 / 14.3: fills the environment-specific parts of public/_headers (copied to build/client/_headers by the build).
//   __API_HTTP__      the API origin from VITE_API_URL (CSP connect-src)
//   __API_WS__        the same origin as ws:// or wss:// (Socket.io)
//   __SCRIPT_HASHES__ 'sha256-...' for EVERY inline <script> in the built HTML (see below)
//   __SENTRY_ORIGIN__ the Sentry ingest origin from VITE_SENTRY_DSN, or nothing when Sentry is off
// `--vercel` (npm run headers:vercel): instead writes vercel.json (rewrites + the same headers) from the template.
// Vercel reads vercel.json from the repository BEFORE the build, so that file is generated and committed:
//   VITE_API_URL=https://api.example.com/api/v1 npm run headers:vercel
// Also writes build/nginx-headers.conf (the "/*" block as nginx `add_header` lines) for the Docker image.
// Reads process.env first, then .env.local, like build-sw.mjs; Vite itself does the same for the bundle.
import { createHash } from "node:crypto"
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

const envLocal = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : ""
const read = (name) =>
  process.env[name] ??
  new RegExp(`^${name}=(.*)$`, "m").exec(envLocal)?.[1]?.trim() ??
  ""

const apiUrl = read("VITE_API_URL") || "http://localhost:4000/api/v1"
const api = new URL(apiUrl)
const dsn = read("VITE_SENTRY_DSN")
const sentryOrigin = dsn ? new URL(dsn).origin : ""

// React Router's SPA/prerendered HTML carries inline scripts (route context, stream bootstrap, our theme script).
// A CSP without 'unsafe-inline' only runs an inline script whose SHA-256 is listed, so the hashes are computed from the
// files the build actually produced (found in 14.1: the hand-pasted hash covered the theme script only, and the page
// stayed blank under the enforced policy). The union over all HTML files is used: some prerendered pages differ.
function inlineScriptHashes(dir) {
  const hashes = new Set()
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name)
      if (statSync(full).isDirectory()) visit(full)
      else if (name.endsWith(".html")) {
        const html = readFileSync(full, "utf8")
        for (const m of html.matchAll(
          /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g
        ))
          if (m[1].trim())
            hashes.add(
              `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`
            )
      }
    }
  }
  if (!existsSync(dir))
    throw new Error(`${dir} does not exist: run \`npm run build\` first`)
  visit(dir)
  return [...hashes].sort().join(" ")
}

const vercelMode = process.argv.includes("--vercel")
const file = vercelMode ? "public/_headers" : "build/client/_headers"
const filled = readFileSync(file, "utf8")
  .replaceAll("__SCRIPT_HASHES__", inlineScriptHashes("build/client"))
  .replaceAll("__API_HTTP__", api.origin)
  .replaceAll("__API_WS__", api.origin.replace(/^http/, "ws"))
  .replaceAll(" __SENTRY_ORIGIN__", sentryOrigin ? ` ${sentryOrigin}` : "")
if (filled.includes("__")) {
  const left = filled.match(/__[A-Z_]+__/g)
  if (left) throw new Error(`unfilled header placeholder: ${left.join(", ")}`)
}
if (vercelMode) {
  writeVercelJson(filled)
  process.exit(0)
}
writeFileSync(file, filled)

// The "/*" block -> nginx. `add_header` is NOT inherited by a location that sets its own add_header,
// so nginx.conf `include`s this file in every location that sets Cache-Control.
const block = /^\/\*\n((?:[ \t]+.+\n?)+)/m.exec(filled)?.[1] ?? ""
const lines = block
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => {
    const i = l.indexOf(":")
    const name = l.slice(0, i).trim()
    const value = l
      .slice(i + 1)
      .trim()
      .replaceAll('"', '\\"')
    return `add_header ${name} "${value}" always;`
  })
writeFileSync("build/nginx-headers.conf", lines.join("\n") + "\n")
console.log(
  `headers: API ${api.origin}${sentryOrigin ? `, Sentry ${sentryOrigin}` : ""}; ${lines.length} security headers`
)

function writeVercelJson(text) {
  /** `_headers` -> [{ pattern, headers: {name: value} }] */
  const rules = []
  let current = null
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue
    if (!/^\s/.test(raw))
      rules.push((current = { pattern: raw.trim(), headers: {} }))
    else if (current) {
      const i = raw.indexOf(":")
      current.headers[raw.slice(0, i).trim()] = raw.slice(i + 1).trim()
    }
  }
  const toSource = (p) =>
    p === "/*" ? "/(.*)" : p.endsWith("*") ? `${p.slice(0, -1)}(.*)` : p
  const config = {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: null,
    installCommand: "npm ci",
    buildCommand: "npm run build",
    outputDirectory: "build/client",
    // Real files (assets, prerendered pages, sw.js) win over rewrites. An unknown URL without a file extension gets the
    // SPA shell; a missing /assets/*.js stays a 404 (never HTML where a script was expected).
    rewrites: [
      {
        source: "/((?!assets/|.*\\.[a-zA-Z0-9]+$).*)",
        destination: "/__spa-fallback.html",
      },
    ],
    headers: rules.map((r) => ({
      source: toSource(r.pattern),
      headers: Object.entries(r.headers).map(([key, value]) => ({
        key,
        value,
      })),
    })),
  }
  writeFileSync("vercel.json", JSON.stringify(config, null, 2) + "\n")
  console.log(`vercel.json written for API ${api.origin}`)
}
