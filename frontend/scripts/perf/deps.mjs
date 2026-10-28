// 13.3: which dependencies weigh what in the CLIENT bundle?  ANALYZE=1 npm run build && node scripts/perf/deps.mjs
// build/stats.json (rollup-plugin-visualizer) has the size of every module AFTER tree shaking, gzipped one by one.
// Gzipping module by module overestimates (no shared dictionary between modules), so each package's number is
// scaled by (real gzip of all emitted chunks / sum of the per-module numbers): an estimate, good for ranking.
// `--check` exits 1 when a package is over 50 kB gzip and is not in JUSTIFIED.
import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const LIMIT_KB = 50
const JUSTIFIED = {
  "react-dom":
    "the renderer (measured on the wire: ~60 kB gzip in entry.client); no lighter option for React 19",
  "@base-ui/react":
    "headless dialog/popover/select/tabs/... used by ~10 components; tree-shaken per component and spread over route chunks, no page downloads 50 kB of it",
}

const stats = JSON.parse(fs.readFileSync("build/stats.json", "utf8"))
const assets = "build/client/assets"
let real = 0
for (const f of fs.readdirSync(assets))
  if (f.endsWith(".js"))
    real += zlib.gzipSync(fs.readFileSync(path.join(assets, f))).length

const perPackage = new Map()
let sum = 0
for (const meta of Object.values(stats.nodeMetas)) {
  const id = meta.id
  const name = id.includes("node_modules/")
    ? (() => {
        const parts = id.split("node_modules/").pop().split("/")
        return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]
      })()
    : "(app code)"
  for (const partId of Object.values(meta.moduleParts)) {
    const part = stats.nodeParts[partId]
    const row = perPackage.get(name) ?? { raw: 0, gz: 0 }
    row.raw += part.renderedLength
    row.gz += part.gzipLength ?? 0
    sum += part.gzipLength ?? 0
    perPackage.set(name, row)
  }
}
const scale = real / sum
console.log(
  `All client JS: ${(real / 1024).toFixed(0)} kB gzip over ${fs.readdirSync(assets).filter((f) => f.endsWith(".js")).length} chunks (scale factor ${scale.toFixed(2)})`
)
console.log("package".padEnd(34), "raw kB".padStart(8), "~gzip kB".padStart(9))
let bad = false
for (const [name, row] of [...perPackage]
  .sort((a, b) => b[1].gz - a[1].gz)
  .slice(0, 14)) {
  const gz = (row.gz * scale) / 1024
  const over = gz > LIMIT_KB && name !== "(app code)"
  const why = JUSTIFIED[name]
  if (over && !why) bad = true
  console.log(
    name.padEnd(34),
    (row.raw / 1024).toFixed(0).padStart(8),
    gz.toFixed(0).padStart(9),
    over
      ? why
        ? `  > ${LIMIT_KB} (justified: ${why})`
        : "  OVER, UNJUSTIFIED"
      : ""
  )
}
if (bad && process.argv.includes("--check")) process.exit(1)
