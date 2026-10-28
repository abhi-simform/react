import type { OrderStatus } from "@/types/domain"
import { cn } from "@/lib/utils"

import { statusColor, statusLabel, type StatusTone } from "../status"

const TONE: Record<StatusTone, string> = {
  neutral: "bg-neutral-100 text-neutral-800",
  info: "bg-sky-100 text-sky-900",
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-900",
}

/** Status as text (never colour alone), through the Stage 2 union helpers. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium",
        TONE[statusColor(status)]
      )}
    >
      {statusLabel(status)}
    </span>
  )
}
