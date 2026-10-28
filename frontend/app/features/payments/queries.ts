import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { paymentKeys } from "@/lib/queryKeys"

import { getPaymentConfig, getPayments } from "./payments.api"

export const paymentQueries = {
  /** Which gateway is active (public key id only). Rarely changes. */
  config: () =>
    queryOptions({
      queryKey: [...paymentKeys.all, "config"] as const,
      queryFn: ({ signal }) => getPaymentConfig(signal),
      staleTime: STALE.static,
    }),
  /** Payment history, optionally for ONE order (the retry panel reads the last failure reason). */
  infinite: (filter: { orderId?: string } = {}) =>
    infiniteQueryOptions({
      queryKey: paymentKeys.list(filter),
      initialPageParam: 1,
      queryFn: ({ pageParam, signal }) =>
        getPayments(pageParam, filter, signal),
      getNextPageParam: (last) =>
        last.meta.hasNext ? last.meta.page + 1 : undefined,
      // A payment changes by gateway events (webhooks): keep it fresh when the user comes back.
      staleTime: STALE.none,
    }),
}
