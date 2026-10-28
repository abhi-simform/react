import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { orderKeys } from "@/lib/queryKeys"
import { paths } from "@/lib/paths"
import type { Order } from "@/types/domain"

import { useReorder } from "../hooks/useReorder"
import { cancelOrder } from "../orders.api"

/**
 * The "cash on delivery instead" fallback for a payment that keeps failing. An existing order
 * cannot change its payment method (the amount and provider order are bound to it), so this
 * CANCELS it (stock released, payment closed) and puts the same items back in the cart, then opens
 * the payment step. The cache is refreshed only at the very end: the optimistic cancel would
 * otherwise unmount this component before it finished.
 */
export function PayAnotherWay({ order }: { order: Order }) {
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reorder = useReorder()

  async function go() {
    setBusy(true)
    try {
      await cancelOrder(order._id, "Switching to cash on delivery")
      await reorder.mutateAsync(order)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ])
      void navigate(paths.checkoutStep("payment"))
    } catch (err) {
      const e = toApiError(err)
      toast.error(
        e.code === "INVALID_TRANSITION"
          ? "This order moved on and cannot be cancelled."
          : "Something went wrong. Please try again."
      )
      setBusy(false)
    }
  }

  return (
    <div className="border-t pt-2 text-xs text-neutral-700">
      <p>
        Prefer another way to pay? You can cancel this order and check out again
        with cash on delivery (where available).
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-1"
        disabled={busy}
        onClick={() => void go()}
      >
        {busy ? "Working..." : "Cancel and choose cash on delivery"}
      </Button>
    </div>
  )
}
