import { ProductCard, type ProductCardProduct } from "./ProductCard"

type ProductGridProps<T extends ProductCardProduct> = {
  products: readonly T[]
  /** Optional badge text per product. */
  badgeFor?: (product: T) => string | undefined
  onAddToCart?: (product: ProductCardProduct) => void
}

/** 2 / 3 / 4 / 5 columns at base / md / lg / xl. Keys are product ids, never indexes. */
export function ProductGrid<T extends ProductCardProduct>({
  products,
  badgeFor,
  onAddToCart,
}: ProductGridProps<T>) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => {
        const badge = badgeFor?.(product)
        return (
          <li key={product._id}>
            <ProductCard product={product} onAddToCart={onAddToCart}>
              {badge && <ProductCard.Badge>{badge}</ProductCard.Badge>}
            </ProductCard>
          </li>
        )
      })}
    </ul>
  )
}
