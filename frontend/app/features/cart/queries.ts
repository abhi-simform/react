import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { cartKeys } from "@/lib/queryKeys"

import { getCart, type CartOwner } from "./cart.api"

export const cartQueries = {
  /** `ownerId` = the user id, or "guest": two owners never share a cache entry. */
  current: (owner: CartOwner, ownerId: string) =>
    queryOptions({
      queryKey: cartKeys.current(owner === "user" ? ownerId : "guest"),
      queryFn: ({ signal }) => getCart(owner, signal),
      staleTime: STALE.cart,
    }),
}
