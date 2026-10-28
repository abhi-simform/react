import type { Product } from "./schemas"

export type {
  Brand,
  CategoryDetail,
  CategoryNode,
  Facets,
  Product,
  ProductListMeta,
  ProductDetail,
  ProductQuery,
  ProductSort,
  ProductStatus,
} from "./schemas"

export type ProductFilters = {
  brands?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStockOnly?: boolean
  minDiscount?: number
  search?: string
}

/** Only what a product card needs: a `Pick` keeps the card honest and easy to fake in tests. */
export type ProductCardData = Pick<
  Product,
  "slug" | "name" | "images" | "price" | "mrp" | "ratingAvg"
>
