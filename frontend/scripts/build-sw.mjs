// 13.10: turns sw/sw.template.js into build/client/sw.js. Run by `npm run build` after `react-router build`.
// - PRECACHE_URLS: the shell HTML and every JS/CSS/font file the first pages need. NOT every route chunk
//   (the build has ~120): the lazy ones are cached on first use by the CacheFirst rule for /assets/.
// - VERSION: a hash of the list and of index.html; any new build changes the service worker's bytes, which is
//   what makes the browser see an update.
import { createHash } from "node:crypto"
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs"
import path from "node:path"

const client = path.resolve("build/client")
const envLocal = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : ""
const apiUrl =
  process.env.VITE_API_URL ??
  /^VITE_API_URL=(.*)$/m.exec(envLocal)?.[1]?.trim() ??
  "http://localhost:4000/api/v1"
const apiOrigin = new URL(apiUrl).origin

const index = readFileSync(path.join(client, "index.html"), "utf8")
// What the shell HTML references: its own scripts/styles/preloads (+ the route chunks below).
const referenced = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
  (m) => m[1]
)
const fonts = readdirSync(path.join(client, "assets"))
  .filter((f) => /inter-latin-wght-normal.*\.woff2$/.test(f))
  .map((f) => `/assets/${f}`)
// The pages that must work offline (13.10): the router manifest lists, per route, its module and the chunks it
// imports. Without this the shell would open offline but a route's JavaScript would not be there.
const OFFLINE_ROUTES = [
  "root",
  "routes/shell",
  "routes/home",
  "routes/products",
  "routes/category",
  "routes/product-detail",
  "routes/cart",
  "routes/offline",
  "routes/deals",
  "routes/help",
  "routes/login",
  "routes/checkout/layout",
  "routes/checkout/address",
  "routes/checkout/delivery",
  "routes/checkout/payment",
  "routes/checkout/review",
]
const manifestFile = readdirSync(path.join(client, "assets")).find((f) =>
  /^manifest-.*\.js$/.test(f)
)
const manifest = JSON.parse(
  /window\.__reactRouterManifest=(\{.*\});?\s*$/s.exec(
    readFileSync(path.join(client, "assets", manifestFile), "utf8")
  )[1]
)
const routeFiles = OFFLINE_ROUTES.flatMap((id) => {
  const r = manifest.routes[id]
  return r ? [r.module, ...(r.imports ?? []), ...(r.css ?? [])] : []
})
const entryFiles = [manifest.entry.module, ...manifest.entry.imports]
// Chunks the cart/checkout pages load with a dynamic import() (React.lazy): not in any manifest list.
const lazyCart = readdirSync(path.join(client, "assets"))
  .filter((f) =>
    /^(CartPage|CartSheet|CouponBox|AnimatedLines|motionFeatures|CartLineList)-.*\.js$/.test(
      f
    )
  )
  .map((f) => `/assets/${f}`)

let urls = [
  ...new Set([
    "/",
    "/__spa-fallback.html",
    "/manifest.webmanifest",
    "/favicon.ico",
    "/icons/icon-192.png",
    ...referenced,
    ...entryFiles,
    ...routeFiles,
    ...lazyCart,
    ...fonts,
  ]),
].filter((u) => !u.startsWith("/assets/") || existsSync(path.join(client, u)))

// A chunk that is precached must be loadable OFFLINE, which means all the chunks it imports STATICALLY must
// be there too (`import x from "./y.js"`; a failed import fails the whole module). The router manifest only
// lists the route modules' own imports, not those of the lazy chunks above, so close over the import graph.
// (Dynamic `import()` edges are deliberately not followed: those are the lazy parts, cached on first use.)
const withStaticImports = (files) => {
  const seen = new Set()
  const visit = (url) => {
    if (seen.has(url) || !url.endsWith(".js")) return
    const file = path.join(client, url)
    if (!existsSync(file)) return
    seen.add(url)
    const code = readFileSync(file, "utf8")
    for (const m of code.matchAll(
      /(?:\bfrom|\bimport)\s*["']\.\/([^"']+\.js)["']/g
    ))
      visit(`/assets/${m[1]}`)
  }
  files.forEach(visit)
  return [...seen]
}
urls = [...new Set([...urls, ...withStaticImports(urls)])]

// Also the CSS files and the entry's direct imports (modulepreload links are in `referenced`).
const version = createHash("sha256")
  .update(JSON.stringify(urls))
  .update(index)
  .digest("hex")
  .slice(0, 12)

const template = readFileSync("sw/sw.template.js", "utf8")
const out = template
  .replace("__VERSION__", version)
  .replace("__API_ORIGIN__", apiOrigin)
  .replace("__PRECACHE_URLS__", JSON.stringify(urls, null, 2))
writeFileSync(path.join(client, "sw.js"), out)
const size = urls
  .map((u) => path.join(client, u))
  .filter((p) => existsSync(p) && statSync(p).isFile())
  .reduce((n, p) => n + statSync(p).size, 0)
console.log(
  `sw.js: version ${version}, precaching ${urls.length} files (${Math.round(size / 1024)} kB), API ${apiOrigin}`
)
