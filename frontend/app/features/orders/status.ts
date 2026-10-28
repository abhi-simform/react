import type { OrderStatus } from "@/types/domain"
import { assertNever } from "@/lib/assert"

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

export function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return "Pending payment"
    case "placed":
      return "Order placed"
    case "packed":
      return "Packed"
    case "shipped":
      return "Shipped"
    case "out_for_delivery":
      return "Out for delivery"
    case "delivered":
      return "Delivered"
    case "cancelled":
      return "Cancelled"
    case "return_requested":
      return "Return requested"
    case "returned":
      return "Returned"
    case "refunded":
      return "Refunded"
    default:
      return assertNever(status)
  }
}

export function statusColor(status: OrderStatus): StatusTone {
  switch (status) {
    case "pending_payment":
      return "warning"
    case "placed":
    case "packed":
    case "shipped":
    case "out_for_delivery":
      return "info"
    case "delivered":
      return "success"
    case "cancelled":
      return "danger"
    case "return_requested":
      return "warning"
    case "returned":
    case "refunded":
      return "neutral"
    default:
      return assertNever(status)
  }
}

/** Status machine: only an unfulfilled order can be cancelled. */
export function canCancel(status: OrderStatus): boolean {
  switch (status) {
    case "pending_payment":
    case "placed":
      return true
    case "packed":
    case "shipped":
    case "out_for_delivery":
    case "delivered":
    case "cancelled":
    case "return_requested":
    case "returned":
    case "refunded":
      return false
    default:
      return assertNever(status)
  }
}

/** Only a delivered order can start a return. */
export function canReturn(status: OrderStatus): boolean {
  switch (status) {
    case "delivered":
      return true
    case "pending_payment":
    case "placed":
    case "packed":
    case "shipped":
    case "out_for_delivery":
    case "cancelled":
    case "return_requested":
    case "returned":
    case "refunded":
      return false
    default:
      return assertNever(status)
  }
}
