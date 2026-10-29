import type { OrderStatus } from "./types"

// A COPY of the API's state machine (backend/src/modules/orders/order.model.ts). The UI uses it to
// OFFER only legal moves; the API still enforces it (409 INVALID_TRANSITION), so a stale copy can
// only make the UI too strict or too loose, never let an illegal move through.
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["placed", "cancelled"],
  placed: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
}
export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  TRANSITIONS[from].includes(to)

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Placed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
}

/** How the staff UI performs a legal transition. */
export type ActionKind = "simple" | "ship" | "cancel" | "confirm"
export type StaffAction = {
  to: OrderStatus
  label: string
  kind: ActionKind
  destructive?: boolean
  description?: string
}

// Transitions that are NOT staff buttons: "return_requested" is the customer's request and
// "pending_payment -> placed" is the payment gateway's job.
const NOT_BY_STAFF = new Set<string>([
  "delivered>return_requested",
  "pending_payment>placed",
])

const LABELS: Partial<Record<OrderStatus, Omit<StaffAction, "to">>> = {
  packed: { label: "Mark packed", kind: "simple" },
  shipped: { label: "Ship...", kind: "ship" },
  out_for_delivery: { label: "Out for delivery", kind: "simple" },
  delivered: { label: "Mark delivered", kind: "simple" },
  cancelled: {
    label: "Cancel order...",
    kind: "cancel",
    destructive: true,
    description:
      "Stock is released and an online payment is refunded. This cannot be undone.",
  },
  returned: {
    label: "Approve return...",
    kind: "confirm",
    description:
      "The returned items go back on the shelf and the customer is told.",
  },
  refunded: {
    label: "Mark refunded...",
    kind: "confirm",
    destructive: true,
    description:
      "Online payments are refunded through the gateway; COD refunds are settled outside this console.",
  },
}

/** The buttons the status bar shows for an order in `from`: legal moves only. */
export function staffActions(from: OrderStatus): StaffAction[] {
  return TRANSITIONS[from]
    .filter((to) => !NOT_BY_STAFF.has(`${from}>${to}`))
    .map((to) => {
      // From return_requested, going back to "delivered" means REJECTING the return.
      if (from === "return_requested" && to === "delivered")
        return {
          to,
          label: "Reject return...",
          kind: "cancel" as const,
          destructive: true,
          description:
            "The order goes back to delivered. Give the customer a reason.",
        }
      const meta = LABELS[to] ?? {
        label: STATUS_LABEL[to],
        kind: "simple" as const,
      }
      return { to, ...meta }
    })
}
