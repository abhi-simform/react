import {
  formatCount,
  formatDate,
  formatRelative,
  toPriceVM,
  type PriceVM,
} from "@/lib/format"

import type { Product, ProductDetail } from "./types"

/**
 * API shape -> view model (6.7), at the boundary. Components receive these and only
 * render: no discount math, no `Intl`, no "what if the image is missing" inside JSX.
 * If the backend renames `mrp` tomorrow, `toPriceVM`'s callers here are the ONLY edit.
 */
export const FALLBACK_IMAGE = "/placeholder.svg"
const LOW_STOCK_AT = 5

type Image = { url: string; alt?: string }
export type ImageVM = { url: string; alt: string }

/** The one place that decides what to show when images are missing. */
function toImages(images: readonly Image[], name: string): ImageVM[] {
  const mapped = images.map((image, i) => ({
    url: image.url,
    alt: image.alt || `${name} (image ${i + 1})`,
  }))
  return mapped.length > 0
    ? mapped
    : [{ url: FALLBACK_IMAGE, alt: `${name} (no photo yet)` }]
}

export type RatingVM = {
  value: number
  count: number
  /** "1.2K" */
  countLabel: string
}

export type ProductCardVM = {
  id: string
  slug: string
  name: string
  brand: string
  /** The first image, or the placeholder. */
  image: ImageVM
  price: PriceVM
  /** Selling price in whole rupees (for comparisons; never display this directly). */
  amount: number
  /** `null` = nobody has rated it yet: render "No ratings yet", not "0.0 (0)". */
  rating: RatingVM | null
  inStock: boolean
  /** "Out of stock", "Only 3 left", or null. */
  stockNote: string | null
}

/** What a card needs; wishlist items and list items both satisfy it. */
export type ProductCardSource = Pick<
  Product,
  | "_id"
  | "slug"
  | "name"
  | "brand"
  | "images"
  | "price"
  | "mrp"
  | "ratingAvg"
  | "ratingCount"
  | "stock"
>

export function toRatingVM(average: number, count: number): RatingVM | null {
  if (!(count > 0) || !Number.isFinite(average)) return null
  return { value: average, count, countLabel: formatCount(count) }
}

export function toProductCardVM(product: ProductCardSource): ProductCardVM {
  const inStock = product.stock > 0
  return {
    id: product._id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: toImages(product.images, product.name)[0]!,
    price: toPriceVM(product.price, product.mrp),
    amount: product.price,
    rating: toRatingVM(product.ratingAvg, product.ratingCount),
    inStock,
    stockNote: !inStock
      ? "Out of stock"
      : product.stock <= LOW_STOCK_AT
        ? `Only ${product.stock} left`
        : null,
  }
}

export type ProductDetailVM = ProductCardVM & {
  images: ImageVM[]
  description: string
  highlights: string[]
  specs: { key: string; value: string }[]
  /** "12 Oct 2026" */
  listedOn: string
  /** "3 days ago" */
  updatedAgo: string
}

export function toProductDetailVM(
  product: ProductDetail,
  now = new Date()
): ProductDetailVM {
  return {
    ...toProductCardVM(product),
    images: toImages(product.images, product.name),
    description: product.description,
    highlights: product.highlights,
    specs: product.specs,
    listedOn: formatDate(product.createdAt),
    updatedAgo: formatRelative(product.updatedAt, { now }),
  }
}
