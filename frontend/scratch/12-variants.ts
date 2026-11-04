// Run: node --import ./scratch/register-alias.mjs scratch/12-variants.ts
import {
  findVariant,
  isOptionAvailable,
  selectOption,
  stockMessage,
} from "../app/features/product/variants.ts"
import { readFileSync } from "node:fs"

import { variantsFixture } from "../app/test/fixtures/variants.ts"

let failures = 0
const check = (ok: boolean, message: string) => {
  if (!ok) {
    failures++
    console.error("FAIL:", message)
  }
}

// products.json is not importable from Node without import attributes: read it.
const raw: { data: Parameters<typeof variantsFixture>[0][] } = JSON.parse(
  readFileSync(
    new URL("../app/test/fixtures/products.json", import.meta.url),
    "utf8"
  )
)
const detail = raw.data[0]!
const variants = variantsFixture(detail)
check(variants.length === 8, "3 colours x 3 storage minus Silver/64 GB = 8")

// incomplete selection -> no variant
check(
  findVariant(variants, { color: "Blue" }) === undefined,
  "partial selection"
)
check(
  findVariant(variants, { color: "Blue", storage: "128 GB" }) !== undefined,
  "complete"
)
check(
  findVariant(variants, { color: "Silver", storage: "64 GB" }) === undefined,
  "missing combo"
)

// out of stock combination is unavailable
check(
  !isOptionAvailable(variants, { color: "Blue" }, "storage", "256 GB"),
  "Blue/256 OOS"
)
check(
  isOptionAvailable(variants, { color: "Blue" }, "storage", "128 GB"),
  "Blue/128 ok"
)

// choosing a conflicting colour clears the storage instead of leaving an invalid pair
const repaired = selectOption(
  variants,
  { color: "Black", storage: "64 GB" },
  "color",
  "Silver"
)
check(
  repaired.color === "Silver" && repaired.storage === undefined,
  "conflict cleared"
)
const kept = selectOption(
  variants,
  { color: "Black", storage: "128 GB" },
  "color",
  "Silver"
)
check(kept.storage === "128 GB", "compatible kept")

check(stockMessage(undefined).startsWith("Select"), "message")
console.log(
  failures === 0 ? "12-variants: ok" : `12-variants: ${failures} failures`
)
process.exitCode = failures ? 1 : 0
