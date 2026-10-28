// Throwaway (3.1, 3.2): the 24-card grid from the fixture, with a sort control
// and a switch between the buggy index keys and the correct id keys.
import { useState } from "react"

import { ProductGrid } from "@/features/catalog/components/ProductGrid"
import { sortProducts, type SortKey } from "@/features/catalog"
import { IndexKeyGrid } from "@/scratch/key-bug/IndexKeyGrid"
import { productsFixture } from "@/test/fixtures/products"

const first24 = productsFixture.slice(0, 24)

export default function ScratchGrid() {
  const [sort, setSort] = useState<SortKey>("relevance")
  const [useIndexKeys, setUseIndexKeys] = useState(false)
  const products = sortProducts(first24, sort)

  return (
    <div className="p-4">
      <h1 className="mb-2 text-xl font-medium">
        ProductGrid (24 from fixture)
      </h1>
      <div className="mb-4 flex gap-4 text-sm">
        <label>
          Sort{" "}
          <select
            className="border p-1"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Rating</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={useIndexKeys}
            onChange={(e) => setUseIndexKeys(e.target.checked)}
          />{" "}
          key={"{index}"} (bug demo)
        </label>
      </div>
      {useIndexKeys ? (
        <IndexKeyGrid products={products} />
      ) : (
        <ProductGrid
          products={products}
          badgeFor={(p) =>
            p.discountPercent >= 50 ? "Lightning deal" : undefined
          }
          onAddToCart={(p) => console.log("add to cart", p.slug)}
        />
      )}
    </div>
  )
}
