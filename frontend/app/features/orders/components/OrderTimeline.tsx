import { formatDate } from "@/lib/format"
import type { Order, OrderStatus } from "@/types/domain"
import { cn } from "@/lib/utils"

import { statusLabel } from "../status"

const FLOW = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const satisfies readonly OrderStatus[]

type Step = {
  status: OrderStatus
  state: "done" | "current" | "upcoming"
  at?: string
  note?: string
}

/**
 * The tracking steps for an order, derived from `statusHistory` (the source of truth, also what
 * the sockets of 11.9 will append to). Normal orders show the full fulfilment path with done /
 * current / upcoming. A cancelled order shows what actually happened, ending in "Cancelled".
 * Orders past delivery (return flow) keep every fulfilment step done: the return has its own list.
 */
export function buildSteps(
  order: Pick<Order, "status" | "statusHistory">
): Step[] {
  const at = new Map<OrderStatus, { at: string; note?: string }>()
  for (const h of order.statusHistory)
    at.set(h.status, { at: h.at, note: h.note })

  if (order.status === "cancelled") {
    return order.statusHistory.map((h, i, all) => ({
      status: h.status,
      state: i === all.length - 1 ? "current" : "done",
      at: h.at,
      note: h.note,
    }))
  }
  const reached = FLOW.filter((s) => at.has(s))
  const lastIdx = reached.length
    ? FLOW.indexOf(reached[reached.length - 1]!)
    : -1
  const pastDelivery =
    order.status === "return_requested" ||
    order.status === "returned" ||
    order.status === "refunded"
  const steps: Step[] = []
  if (at.has("pending_payment") && order.status === "pending_payment")
    steps.push({
      status: "pending_payment",
      state: "current",
      ...at.get("pending_payment")!,
    })
  FLOW.forEach((status, i) => {
    const entry = at.get(status)
    const done =
      i < lastIdx || (i === lastIdx && (pastDelivery || status === "delivered"))
    steps.push({
      status,
      state: done ? "done" : i === lastIdx ? "current" : "upcoming",
      ...entry,
    })
  })
  return steps
}

/** An ordered list: screen readers announce "list, 5 items", and the current step via aria-current. */
export function OrderTimeline({
  order,
  eta,
}: {
  order: Pick<Order, "status" | "statusHistory">
  eta?: string
}) {
  const steps = buildSteps(order)
  return (
    <ol aria-label="Order tracking" className="flex flex-col gap-1 text-sm">
      {steps.map((s) => (
        <li
          key={s.status}
          aria-current={s.state === "current" ? "step" : undefined}
          className={cn(
            "flex gap-2 rounded px-2 py-1",
            s.state === "upcoming" && "text-neutral-500",
            s.state === "current" && "font-medium",
            s.state === "current" &&
              s.status === "out_for_delivery" &&
              "bg-amber-100 text-amber-900"
          )}
        >
          <span aria-hidden className="w-4 text-center">
            {s.state === "done" ? "✓" : s.state === "current" ? "●" : "○"}
          </span>
          <span className="flex-1">
            {statusLabel(s.status)}
            <span className="sr-only">
              {s.state === "done"
                ? " (completed)"
                : s.state === "current"
                  ? " (current step)"
                  : " (upcoming)"}
            </span>
            {s.note && s.status === "cancelled" ? `: ${s.note}` : ""}
            {s.state === "upcoming" && s.status === "delivered" && eta
              ? ` (expected by ${formatDate(eta)})`
              : ""}
          </span>
          {s.at && (
            <time dateTime={s.at} className="text-xs text-neutral-600">
              {formatDate(s.at, { hour: "numeric", minute: "2-digit" })}
            </time>
          )}
        </li>
      ))}
    </ol>
  )
}
