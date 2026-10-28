// BROKEN ON PURPOSE (3.2): identical to ProductGrid except `key={index}`.
// Like the 3rd card, then change the sort: the heart stays at position 3
// because React matched the state by position, not by product.
import { ProductCard, type ProductCardProduct } from "@/features/catalog"

export function IndexKeyGrid({
  products,
}: {
  products: readonly ProductCardProduct[]
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, index) => (
        <li key={index}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}
