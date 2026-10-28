// Run: node --import ./scratch/register-alias.mjs scratch/14-filters.ts
// 5.4: parse/serialise the URL defensively. Garbage in must never throw.
import {
  countActiveFilters,
  parseFilters,
  toProductQuery,
  toSearchParams,
} from "../app/features/catalog/filters.ts"
import { toQueryString } from "../app/lib/api/query.ts"

let failures = 0
function check(ok: boolean, message: string) {
  if (!ok) {
    failures++
    console.assert(false, message)
  }
}
const parse = (q: string) => parseFilters(new URLSearchParams(q))

// defaults
const empty = parse("")
check(
  empty.page === 1 && empty.sort === "relevance" && empty.view === "grid",
  "defaults"
)
check(empty.brands.length === 0 && empty.minPrice === undefined, "no filters")

// garbage never crashes and falls back
const junk = parse(
  "page=-5&sort=banana&minPrice=abc&maxPrice=&minRating=9&view=3d&inStock=maybe"
)
check(junk.page === 1, "page=-5 -> 1")
check(parse("page=abc").page === 1, "page=abc -> 1")
check(parse("page=2.5").page === 1, "fractional page -> 1")
check(parse("page=99999999").page === 1, "absurd page -> 1")
check(junk.sort === "relevance", "unknown sort -> relevance")
check(junk.minPrice === undefined, "minPrice=abc -> absent")
check(junk.maxPrice === undefined, "empty maxPrice -> absent, NOT 0")
check(junk.minRating === undefined, "rating 9 out of range -> absent")
check(junk.view === "grid" && junk.inStock === false, "bad view / inStock")
check(parse("brand=&brand=%20").brands.length === 0, "blank brands dropped")
check(
  parse("brand=Apple&brand=Apple&brand=Sony").brands.join() === "Apple,Sony",
  "brands de-duplicated"
)
check(parse("search=%20%20").search === undefined, "blank search -> absent")

// reversed range is repaired
const swapped = parse("minPrice=500&maxPrice=100")
check(
  swapped.minPrice === 100 && swapped.maxPrice === 500,
  "reversed range swapped"
)

// round trip, defaults omitted
const full = parse(
  "search=phone&brand=Apple&brand=Samsung&minPrice=10000&maxPrice=50000&minRating=4&inStock=true&sort=price_asc&page=2&view=list"
)
check(
  full.brands.length === 2 && full.minRating === 4 && full.page === 2,
  "full parse"
)
const out = toSearchParams(full).toString()
check(
  out ===
    "search=phone&brand=Apple&brand=Samsung&minPrice=10000&maxPrice=50000&minRating=4&inStock=true&sort=price_asc&page=2&view=list",
  "round trip: " + out
)
check(toSearchParams(empty).toString() === "", "defaults give a clean URL")
check(
  toSearchParams(parse("sort=relevance&page=1&view=grid")).toString() === "",
  "explicit defaults are dropped"
)

// user preference as default (stretch): URL omits it, explicit URL wins
const prefs = { sort: "price_asc", view: "list" } as const
check(
  parseFilters(new URLSearchParams(""), prefs).sort === "price_asc",
  "pref used when URL silent"
)
check(
  parseFilters(new URLSearchParams("sort=rating"), prefs).sort === "rating",
  "URL beats pref"
)
check(
  toSearchParams(
    parseFilters(new URLSearchParams(""), prefs),
    prefs
  ).toString() === "",
  "pref default omitted"
)

check(
  countActiveFilters(full) === 6,
  "active count " + countActiveFilters(full)
)
check(countActiveFilters(empty) === 0, "no active filters")

// API query: brand list becomes brand=a,b; facets requested
const qs = toQueryString(toProductQuery(full, "mobiles"))
check(
  qs.includes("brand=Apple%2CSamsung") &&
    qs.includes("category=mobiles") &&
    qs.includes("facets=true") &&
    qs.includes("minRating=4"),
  "api query " + qs
)

if (failures) process.exit(1)
console.log("14-filters: all checks passed")
