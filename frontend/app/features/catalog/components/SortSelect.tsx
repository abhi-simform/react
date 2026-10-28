import { useId } from "react"

import { PRODUCT_SORTS, productSortSchema } from "../schemas"
import type { ProductSort } from "../types"

const LABELS: Record<ProductSort, string> = {
  relevance: "Relevance",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  newest: "Newest",
  rating: "Customer rating",
  discount: "Discount",
  popularity: "Popularity",
}

export function SortSelect({
  value,
  onChange,
}: {
  value: ProductSort
  onChange: (sort: ProductSort) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id}>Sort by</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          // The DOM gives a plain string: parse it back into the union instead of casting.
          const parsed = productSortSchema.safeParse(e.target.value)
          if (parsed.success) onChange(parsed.data)
        }}
        className="rounded border p-1"
      >
        {PRODUCT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {LABELS[sort]}
          </option>
        ))}
      </select>
    </div>
  )
}
