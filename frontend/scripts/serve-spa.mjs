// 14.1: serves build/client the way a real static SPA host does (no Node runtime logic in the app):
//   - files that exist are served with the Cache-Control / security headers of build/client/_headers
//   - an unknown path WITHOUT a file extension gets the SPA shell (deep links and refresh work)
//   - an unknown path WITH an extension (a missing hashed asset) is a real 404, not HTML (otherwise the
//     browser would try to run HTML as JavaScript after a deploy removed an old chunk)
//   - responses are gzip'd on the fly (a CDN or nginx does this for you in production)
// `npm start` = this script. PORT picks the port (default 5173); STATIC_DIR the folder (default build/client).
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { pipeline } from "node:stream"
import { createGzip } from "node:zlib"

const root = path.resolve(process.env.STATIC_DIR ?? "build/client")
const port = Number(process.env.PORT ?? 5173)
const SHELL = existsSync(path.join(root, "__spa-fallback.html"))
  ? "__spa-fallback.html"
  : "index.html"

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json",
}
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest)|image\/svg)/

/** Parses the Netlify/Cloudflare `_headers` format: a path pattern line, then indented `Name: value` lines. */
function parseHeaders(file) {
  if (!existsSync(file)) return []
  const rules = []
  let current = null
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: {} }
      rules.push(current)
    } else if (current) {
      const i = raw.indexOf(":")
      current.headers[raw.slice(0, i).trim()] = raw.slice(i + 1).trim()
    }
  }
  return rules
}
const rules = parseHeaders(path.join(root, "_headers"))
const matches = (pattern, urlPath) =>
  pattern.endsWith("*")
    ? urlPath.startsWith(pattern.slice(0, -1))
    : urlPath === pattern
function headersFor(urlPath) {
  const out = {}
  for (const rule of rules)
    if (matches(rule.pattern, urlPath)) Object.assign(out, rule.headers)
  return out
}

function resolveFile(urlPath) {
  const clean = path
    .normalize(decodeURIComponent(urlPath))
    .replace(/^(\.\.[/\\])+/, "")
  const target = path.join(root, clean)
  if (!target.startsWith(root)) return null
  for (const candidate of [target, path.join(target, "index.html")])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  return null
}

createServer((req, res) => {
  const urlPath = new URL(req.url ?? "/", "http://x").pathname
  let file = resolveFile(urlPath)
  if (!file) {
    if (path.extname(urlPath)) {
      res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found")
      return
    }
    file = path.join(root, SHELL)
  }
  const type = TYPES[path.extname(file)] ?? "application/octet-stream"
  // A path rule is matched against the URL the browser asked for, not the file we fall back to.
  const headers = {
    ...headersFor(urlPath === "/" ? "/index.html" : urlPath),
    "Content-Type": type,
    Vary: "Accept-Encoding",
  }
  if (file.endsWith(SHELL) && !headers["Cache-Control"])
    headers["Cache-Control"] = "no-cache"
  const gzip =
    COMPRESSIBLE.test(type) &&
    /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")
  if (gzip) headers["Content-Encoding"] = "gzip"
  res.writeHead(200, headers)
  if (req.method === "HEAD") return void res.end()
  const stream = createReadStream(file)
  if (gzip) pipeline(stream, createGzip(), res, () => undefined)
  else pipeline(stream, res, () => undefined)
}).listen(port, () => {
  console.log(
    `serving ${root} on http://localhost:${port} (SPA fallback: ${SHELL})`
  )
})
