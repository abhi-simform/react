import { Button } from "@/components/ui/button"
import type { Order } from "@/types/domain"

import { useInvoiceDownload } from "../hooks/useInvoiceDownload"
import { useReorder } from "../hooks/useReorder"
import { canCancel, canReturn } from "../status"
import { CancelOrderDialog } from "./CancelOrderDialog"
import { ReturnDialog } from "./ReturnDialog"

/**
 * Which actions exist is decided by the status machine helpers (`canCancel`, `canReturn`), the
 * same rule the API enforces (a stale tab that shows a button the order has outgrown gets a 409
 * and a message, tested with curl). The return window comes from the server (`returnableUntil`).
 */
export function OrderActions({ order }: { order: Order }) {
  const invoice = useInvoiceDownload(order._id, order.orderNumber)
  const reorder = useReorder()
  const hasInvoice =
    order.status !== "pending_payment" && order.status !== "cancelled"
  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Order actions"
    >
      {canCancel(order.status) && <CancelOrderDialog order={order} />}
      {canReturn(order.status) && order.returnableUntil && (
        <ReturnDialog order={order} />
      )}
      {hasInvoice && (
        <Button
          variant="outline"
          disabled={invoice.isPending}
          onClick={() => invoice.mutate()}
        >
          {invoice.isPending ? "Preparing invoice..." : "Download invoice"}
        </Button>
      )}
      <Button
        variant="outline"
        disabled={reorder.isPending}
        onClick={() => reorder.mutate(order)}
      >
        {reorder.isPending ? "Adding..." : "Buy again"}
      </Button>
      {canReturn(order.status) && !order.returnableUntil && (
        <p className="w-full text-xs text-neutral-600">
          The 7 day return window for this order has closed.
        </p>
      )}
    </div>
  )
}
