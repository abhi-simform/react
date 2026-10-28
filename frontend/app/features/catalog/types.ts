// Stage 1 provisional shape, taken from the real list response.
// Stage 2 replaces this with a type inferred from the Zod schema.
export type Product = {
  _id: string
  name: string
  slug: string
  brand: string
  category: { _id: string; name: string; slug: string }
  tags: string[]
  /** integer rupees */
  price: number
  /** integer rupees */
  mrp: number
  discountPercent: number
  images: { url: string; alt: string }[]
  stock: number
  sku: string
  ratingAvg: number
  ratingCount: number
  soldCount: number
  createdAt: string
}

export type ProductFilters = {
  brands?: string[]
  minPrice?: number
  maxPrice?: number
  minRating?: number
  inStockOnly?: boolean
  minDiscount?: number
  search?: string
}
