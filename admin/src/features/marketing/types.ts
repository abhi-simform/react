export type Coupon = {
  _id: string
  code: string
  description: string
  type: "percent" | "flat"
  value: number
  maxDiscount?: number
  minOrder: number
  firstOrderOnly: boolean
  startsAt?: string
  expiresAt?: string
  usageLimit?: number
  usedCount: number
  perUserLimit: number
  isActive: boolean
  createdAt: string
}
export type Deal = {
  _id: string
  product: string
  productInfo: {
    id: string
    name: string
    slug: string
    price: number
    image: string | null
  } | null
  dealPrice: number
  startsAt: string
  endsAt: string
  stockLimit: number
  claimed: number
  isActive: boolean
  badge?: string
}
export type Banner = {
  _id: string
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl: string
  placement: "hero" | "strip"
  sortOrder: number
  startsAt?: string
  endsAt?: string
  isActive: boolean
}
