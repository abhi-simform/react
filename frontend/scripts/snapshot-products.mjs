// Snapshot the real API into a fixture. The API caps `limit` at 60, so we page
// through and merge. Run: node scripts/snapshot-products.mjs
import { writeFile } from "node:fs/promises"

const base = process.env.VITE_API_URL ?? "http://localhost:4000/api/v1"
const limit = 60
const items = []
let page = 1
let totalPages = 1

do {
  const res = await fetch(`${base}/products?limit=${limit}&page=${page}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`)
  const json = await res.json()
  items.push(...json.data)
  totalPages = json.meta.totalPages
  page++
} while (page <= totalPages)

const out = {
  success: true,
  data: items,
  meta: { page: 1, limit: items.length, total: items.length, totalPages: 1 },
}
await writeFile(
  new URL("../app/test/fixtures/products.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n"
)
console.log(`wrote ${items.length} products`)
