import type { QueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { orderKeys } from "@/lib/queryKeys"
import type { Order } from "@/types/domain"

/** `order:status` from the API (B9): the new status plus the history line to append. */
export const orderStatusEventSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  from: z.string().nullable(),
  paymentStatus: z.string().nullable(),
  returnStatus: z.string().nullable(),
  entry: z.object({
    status: z.string(),
    at: z.string(),
    note: z.string().nullable(),
  }),
})
export type OrderStatusEvent = z.infer<typeof orderStatusEventSchema>

/**
 * Patch one cached order from a status event (pure: no QueryClient, so it can be checked on its
 * own). The event is idempotent by construction: the history line is appended only if that
 * (status, at) pair is not there yet, so a duplicate delivery or a refetch that already contains
 * it changes nothing.
 */
export function patchOrder(order: Order, ev: OrderStatusEvent): Order {
  const has = order.statusHistory.some(
    (h) => h.status === ev.entry.status && h.at === ev.entry.at
  )
  return {
    ...order,
    status: ev.status as Order["status"],
    paymentStatus: ev.paymentStatus ?? order.paymentStatus,
    statusHistory: has
      ? order.statusHistory
      : [
          ...order.statusHistory,
          {
            status: ev.entry.status as Order["status"],
            at: ev.entry.at,
            note: ev.entry.note ?? undefined,
          },
        ],
  }
}

/**
 * How a socket event, the Query cache and polling cooperate (11.9):
 * 1. the event PATCHES the cached order at once (the timeline moves immediately);
 * 2. it then INVALIDATES the order (and the lists), so the server's version replaces our patch and
 *    anything the event does not carry (return details, refund rows) arrives; one refetch,
 *    no duplicate state;
 * 3. polling is only a fallback: the detail query polls only while the socket is not connected.
 */
export function applyOrderStatus(
  queryClient: QueryClient,
  ev: OrderStatusEvent
) {
  queryClient.setQueryData<Order>(orderKeys.detail(ev.orderId), (old) =>
    old ? patchOrder(old, ev) : old
  )
  void queryClient.invalidateQueries({ queryKey: orderKeys.detail(ev.orderId) })
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
}
