import { readFileSync } from "node:fs"

import { productSchema } from "../app/features/catalog/schemas.ts"
import { paginatedSchema } from "../app/lib/api/schemas.ts"

/** Schema-validated fixture load for scratch scripts (no `as` cast on JSON). */
export function loadProducts() {
  const json: unknown = JSON.parse(
    readFileSync(
      new URL("../app/test/fixtures/products.json", import.meta.url),
      "utf8"
    )
  )
  return paginatedSchema(productSchema).parse(json).data
}
