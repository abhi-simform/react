import type { Product, ProductStatus } from "@/types/domain"

import raw from "./products.json"

// `satisfies Product[]` on the raw JSON import fails: JSON modules widen
// string literals, so `status` is `string`, not "active" | "draft" | "archived".
// That is the compiler finding a real gap between "what JSON can prove" and
// "what the type promises". A small runtime check closes it (Zod replaces this in 2.6).
function toStatus(value: string): ProductStatus {
  if (value === "active" || value === "draft" || value === "archived") {
    return value
  }
  throw new Error(`Unknown product status in fixture: ${value}`)
}

export const productsFixture: Product[] = raw.data.map((p) => ({
  ...p,
  status: toStatus(p.status),
}))
