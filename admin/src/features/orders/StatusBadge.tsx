import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL } from "./transitions"
import type { OrderStatus } from "./types"

const VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending_payment: "outline",
  placed: "default",
  packed: "default",
  shipped: "default",
  out_for_delivery: "default",
  delivered: "secondary",
  cancelled: "destructive",
  return_requested: "outline",
  returned: "secondary",
  refunded: "secondary",
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
