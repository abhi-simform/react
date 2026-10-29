// Response shapes (claims, not validated). Prices are whole rupees. Written from the real API.
export type ProductStatus = "active" | "draft" | "archived"

export type ProductRow = {
  _id: string
  name: string
  slug: string
  sku: string
  brand: string
  price: number
  mrp: number
  stock: number
  status: ProductStatus
  soldCount: number
  isFeatured: boolean
  images: { url: string; alt?: string }[]
  category: { _id: string; name: string; slug: string } | null
  seller?: { _id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type Variant = {
  sku: string
  color?: string
  size?: string
  price: number
  stock: number
}

// Optional where the API may omit an empty list/string (older documents).
export type ProductDetail = Omit<ProductRow, "images"> & {
  images?: { url: string; alt?: string }[]
  description?: string
  highlights?: string[]
  tags?: string[]
  specs?: { key: string; value: string }[]
  variants?: Variant[]
}

export type Category = {
  _id: string
  name: string
  slug: string
  parent: string | null
  image?: string | null
  sortOrder: number
  isActive: boolean
  productCount: number
}
export type Brand = {
  _id: string
  name: string
  slug: string
  logo?: string | null
  productCount: number
}
