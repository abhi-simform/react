import { cn } from "@/lib/utils"

import { ProductCard, type ProductCardProduct } from "./ProductCard"

type ProductGridProps = {
  products: readonly ProductCardProduct[]
  /** Optional badge text per product. */
  badgeFor?: (product: ProductCardProduct) => string | undefined
  onAddToCart?: (product: ProductCardProduct) => void
  /** "list" is a single column. */
  view?: "grid" | "list"
  /** How many of the first cards load their image eagerly (13.5): the first row, which is the LCP. */
  priorityCount?: number
}

/** 2 / 3 / 4 / 5 columns at base / md / lg / xl. Keys are product ids, never indexes. */
export function ProductGrid({
  products,
  badgeFor,
  onAddToCart,
  view = "grid",
  priorityCount = 0,
}: ProductGridProps) {
  return (
    <ul
      className={cn(
        "grid gap-3",
        view === "grid"
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : "grid-cols-1"
      )}
    >
      {products.map((product, index) => {
        const badge = badgeFor?.(product)
        return (
          <li key={product.id}>
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              imagePriority={index < priorityCount}
            >
              {badge && <ProductCard.Badge>{badge}</ProductCard.Badge>}
            </ProductCard>
          </li>
        )
      })}
    </ul>
  )
}
