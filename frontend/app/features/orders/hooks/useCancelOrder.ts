import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toApiError } from "@/lib/api/errors"
import { orderKeys, paymentKeys } from "@/lib/queryKeys"
import type { Order } from "@/types/domain"

import { cancelOrder } from "../orders.api"

/**
 * Cancel with an OPTIMISTIC status change (9.5 pattern): the page flips to "Cancelled" at once,
 * the snapshot is restored if the server refuses (the order was packed in the meantime: 409
 * INVALID_TRANSITION), and the order is refetched either way, because for a paid order the real
 * refund progress comes from the server (`paymentStatus: refund_pending -> refunded`).
 */
export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient()
  const key = orderKeys.detail(orderId)
  return useMutation({
    meta: { silent: true },
    mutationFn: (reason: string | undefined) => cancelOrder(orderId, reason),
    onMutate: async (reason) => {
      await queryClient.cancelQueries({ queryKey: key }) // an in-flight poll must not overwrite us
      const previous = queryClient.getQueryData<Order>(key)
      if (previous)
        queryClient.setQueryData<Order>(key, {
          ...previous,
          status: "cancelled",
          cancelReason: reason,
          statusHistory: [
            ...previous.statusHistory,
            {
              status: "cancelled",
              at: new Date().toISOString(),
              note: reason ?? "Cancelled by customer",
            },
          ],
        })
      return { previous }
    },
    onError: (err, _reason, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      const e = toApiError(err)
      toast.error(
        e.code === "INVALID_TRANSITION"
          ? "This order can no longer be cancelled: it is already on its way."
          : "We could not cancel the order. Please try again."
      )
    },
    onSuccess: (order) => {
      queryClient.setQueryData(key, order)
      toast.success("Order cancelled")
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
      ]),
  })
}
