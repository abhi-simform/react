export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderItem = {
  productId: string
  sku: string
  title: string
  image: string | null
  unitPrice: number
  mrp: number
  qty: number
  lineTotal: number
  deal: boolean
}
export type Address = {
  fullName?: string
  phone?: string
  line1?: string
  line2?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
}
export type HistoryEntry = {
  status: string
  at: string
  note: string | null
}
export type ReturnRequest = {
  status: "requested" | "approved" | "rejected" | "refunded"
  reason: string
  note: string | null
  requestedAt: string
  resolvedAt: string | null
  refundAmount: number | null
  items: { productId: string; title: string; qty: number; unitPrice: number }[]
  photos: string[]
  history: HistoryEntry[]
}
export type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
} | null

export type AdminOrder = {
  id: string
  orderNumber: string
  userId: string
  customer: Customer
  items: OrderItem[]
  addressSnapshot: Address | null
  delivery: { method?: string; slot?: string } | null
  status: OrderStatus
  statusHistory: HistoryEntry[]
  pricing: {
    subtotal: number
    discount: number
    shipping: number
    tax: number
    total: number
  }
  coupon: { code: string; discount: number } | null
  paymentMethod: "cod" | "razorpay"
  paymentStatus: string
  shipment: {
    carrier: string
    trackingId: string | null
    shippedAt: string | null
  } | null
  cancelReason: string | null
  deliveredAt: string | null
  returnRequest: ReturnRequest | null
  staffNotes: { text: string; by: string | null; at: string }[]
  createdAt: string
  updatedAt: string
}

export type PaymentInfo = {
  id: string
  provider: string
  status: string
  method: string | null
  amount: number
  refundedAmount: number
  refundable: number
  paidAt: string | null
  refunds: {
    amount: number
    status: string
    reason: string | null
    createdAt: string
  }[]
}
export type AdminOrderDetail = AdminOrder & { payment: PaymentInfo | null }

/** What `/seller/orders` returns: only the seller's own lines, no pricing, no customer. */
export type SellerOrder = {
  id: string
  orderNumber: string
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
  yourTotal: number
  units: number
  addressSnapshot: Address | null
  delivery: { method?: string; slot?: string } | null
  shipment: AdminOrder["shipment"]
  statusHistory: HistoryEntry[]
  paymentMethod: string
}
