import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth"
import { cartKeys, orderKeys } from "@/lib/queryKeys"

import { placeOrder } from "./orders.api"
import { clearAttemptKey, getAttemptKey } from "./idempotency"
import type { PlaceOrderInput } from "./schemas"

/**
 * "Place order" (11.3): a mutation with the attempt's idempotency key. On success the created
 * order is written into the cache (the success page renders instantly and survives a refresh via
 * the normal detail query), the orders lists are invalidated and the cart is refetched (the
 * server emptied it). Errors are NOT toasted globally here (`silent`): the review step explains
 * each case (stock, price, coupon, COD, network) in its own words.
 */
export function usePlaceOrder() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? "anonymous"
  return useMutation({
    mutationKey: ["orders", "place"],
    meta: { silent: true },
    mutationFn: (input: PlaceOrderInput) =>
      placeOrder(input, getAttemptKey(userId)),
    onSuccess: (order) => {
      clearAttemptKey(userId)
      queryClient.setQueryData(orderKeys.detail(order._id), order)
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
    },
    // The cart changes on success (emptied) AND on stock/price failures (the server's numbers
    // moved): either way the truth is on the server.
    // (`void`: the mutation must not stay "pending" until that refetch lands.)
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
  })
}
