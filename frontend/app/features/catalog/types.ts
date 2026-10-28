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
