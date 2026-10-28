import type { Order } from "@/types/domain"

// Hand-written sample orders (the orders API does not exist until B5).
const address = {
  fullName: "Test Customer",
  phone: "9999999999",
  line1: "1 Main Road",
  city: "Pune",
  state: "MH",
  pincode: "411001",
  type: "home" as const,
}

export const ordersFixture: Order[] = [
  {
    _id: "o1",
    orderNumber: "SS-1001",
    userId: "u1",
    items: [],
    addressSnapshot: address,
    status: "delivered",
    statusHistory: [],
    pricing: {
      subtotal: 1000,
      discount: 0,
      shipping: 0,
      tax: 180,
      total: 1180,
    },
    paymentMethod: "razorpay",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    _id: "o2",
    orderNumber: "SS-1002",
    userId: "u1",
    items: [],
    addressSnapshot: address,
    status: "placed",
    statusHistory: [],
    pricing: { subtotal: 400, discount: 0, shipping: 40, tax: 72, total: 512 },
    paymentMethod: "cod",
    createdAt: "2026-10-20T10:00:00.000Z",
  },
]
