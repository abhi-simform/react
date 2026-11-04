import type { ProductDetail } from "@/features/catalog"
import type { Variant } from "@/types/domain"

const COLORS = ["Black", "Blue", "Silver"] as const
const STORAGE = ["64 GB", "128 GB", "256 GB"] as const

/**
 * Demo variants (the backend serves none): a deterministic colour x storage
 * grid with one MISSING combination (Silver / 64 GB) and one OUT OF STOCK
 * (Blue / 256 GB), so disabled options can be exercised on every product.
 */
export function variantsFixture(product: ProductDetail): Variant[] {
  const variants: Variant[] = []
  COLORS.forEach((color, ci) => {
    STORAGE.forEach((storage, si) => {
      if (color === "Silver" && storage === "64 GB") return
      const price = product.price + si * 1000
      variants.push({
        sku: `${product.sku}-${color.toUpperCase()}-${si}`,
        productId: product._id,
        attributes: { color, storage },
        price,
        mrp: Math.max(product.mrp, price) + si * 1000,
        stock:
          color === "Blue" && storage === "256 GB"
            ? 0
            : 2 + ((ci + si) % 3) * 4,
        images: product.images.map((i) => i.url),
      })
    })
  })
  return variants
}
