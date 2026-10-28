import type { Product } from "@/types/domain"

export type { Product }

export type ProductFilters = {
  brands?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStockOnly?: boolean
  minDiscount?: number
  search?: string
}

/** Server-side sort keys (the API also supports "popularity"). */
export type ProductSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "rating"
  | "discount"
  | "popularity"

/** Query params for GET /products. All optional, so `Partial` of the full shape. */
export type ProductQuery = Partial<{
  page: number
  limit: number
  sort: ProductSort
  search: string
  category: string
  brand: string[]
  minPrice: number
  maxPrice: number
  minRating: number
  minDiscount: number
  inStock: boolean
}>

/** Only what a product card needs: a `Pick` keeps the card honest and easy to fake in tests. */
export type ProductCardData = Pick<
  Product,
  "slug" | "name" | "images" | "price" | "mrp" | "ratingAvg"
>
