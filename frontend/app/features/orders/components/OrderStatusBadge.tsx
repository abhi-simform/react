import type { OrderStatus } from "@/types/domain"
import { cn } from "@/lib/utils"

import { statusColor, statusLabel, type StatusTone } from "../status"

const TONE: Record<StatusTone, string> = {
  neutral: "bg-muted text-foreground",
  info: "bg-sky-100 text-sky-900",
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-warning-muted text-warning",
  danger: "bg-destructive-muted text-destructive",
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
