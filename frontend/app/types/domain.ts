// Domain model for the storefront. Shapes follow the REAL API where an endpoint
// exists today (users, categories, products, from backend B0) and the plan's
// data model (learning-plan 2.3) for entities whose backend phase has not landed
// yet (marked "planned"). Types are erased at runtime: nothing here validates
// anything; Stage 2.6 adds Zod schemas for the parts that cross the network.
// Product and ProductDetail are NOT here: they are inferred from the Zod schemas
// in features/catalog/schemas.ts, so there is no hand-written copy to drift.

/** Whole Indian rupees, exactly as the API sends them (`price: 59999`). */
export type Money = number
/** Integer paise (1/100 rupee): used inside the cart/totals layer only. */
export type Paise = number
/** ISO 8601 UTC string, e.g. "2026-10-08T06:29:38.953Z". */
export type ISODateString = string
/** Mongo ObjectId as a string. */
export type Id = string

export type Role = "customer" | "seller" | "admin"

/** From `GET /auth/me`, `GET /users/me` (note: `id`, not `_id`). */
export type User = {
  id: Id
  name: string
  email: string
  role: Role
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  createdAt: ISODateString
}

/** planned (B2) */
export type Address = {
  _id: Id
  userId: Id
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  type: "home" | "work"
  isDefault: boolean
}

/** From `GET /categories`: a tree. Note: `id`, not `_id`. */
export type Category = {
  id: Id
  name: string
  slug: string
  image?: string
  children: Category[]
}

/** planned (B1): today a brand is only a string on the product. */
export type Brand = {
  _id: Id
  name: string
  slug: string
  logoUrl?: string
}

/** planned: variants/SKUs are not served by B0 (each product has one `sku`). */
export type Variant = {
  sku: string
  productId: Id
  attributes: Record<string, string>
  price: Money
  mrp: Money
  stock: number
  images: readonly string[]
}

/** planned (B3) */
export type CartItem = {
  sku: string
  qty: number
  priceSnapshot: Money
  savedForLater: boolean
}

/** planned (B3) */
export type Cart = {
  _id: Id
  userId?: Id
  guestToken?: string
  items: CartItem[]
  couponCode?: string
}

/** Mirrors the status machine in learning-plan 2.3. Handled with exhaustive switches (2.2). */
export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "return_requested"
  | "returned"
  | "refunded"

/** planned (B5): snapshot of the product at purchase time. */
export type OrderItem = {
  sku: string
  productId: Id
  title: string
  image: string
  unitPrice: Money
  qty: number
  lineTotal: Money
}

/** planned (B5) */
export type Order = {
  _id: Id
  orderNumber: string
  userId: Id
  items: OrderItem[]
  addressSnapshot: Omit<Address, "_id" | "userId" | "isDefault">
  status: OrderStatus
  statusHistory: { status: OrderStatus; at: ISODateString; note?: string }[]
  pricing: {
    subtotal: Money
    discount: Money
    shipping: Money
    tax: Money
    total: Money
  }
  paymentMethod: "razorpay" | "cod"
  createdAt: ISODateString
}

/** planned (B6) */
export type Payment = {
  _id: Id
  orderId: Id
  provider: "razorpay" | "cod"
  razorpayOrderId?: string
  razorpayPaymentId?: string
  status: "created" | "authorized" | "captured" | "failed" | "refunded"
  amount: Money
  method?: string
}

/** planned (B7) */
export type Review = {
  _id: Id
  productId: Id
  userId: Id
  rating: 1 | 2 | 3 | 4 | 5
  title: string
  body: string
  photos: string[]
  verifiedPurchase: boolean
  helpfulCount: number
  status: "pending" | "published" | "rejected"
}

/** planned (B4) */
export type Coupon = {
  code: string
  type: "percent" | "flat"
  value: number
  minOrder: Money
  maxDiscount?: Money
  validFrom: ISODateString
  validTo: ISODateString
  usageLimit: number
  appliesTo: "all" | "category" | "product"
}

/** planned (B4) */
export type Deal = {
  _id: Id
  productId: Id
  sku?: string
  dealPrice: Money
  startsAt: ISODateString
  endsAt: ISODateString
  stockCap: number
  claimed: number
}
