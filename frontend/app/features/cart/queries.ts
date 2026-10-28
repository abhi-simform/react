import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { cartKeys } from "@/lib/queryKeys"

import { getAvailableCoupons, getCart, type CartOwner } from "./cart.api"

export const cartQueries = {
  /** `ownerId` = the user id, or "guest": two owners never share a cache entry. */
  current: (owner: CartOwner, ownerId: string) =>
    queryOptions({
      queryKey: cartKeys.current(owner === "user" ? ownerId : "guest"),
      queryFn: ({ signal }) => getCart(owner, signal),
      staleTime: STALE.cart,
    }),
  /** "Available coupons": nested under the cart key, so any cart invalidation refreshes it too. */
  coupons: (owner: CartOwner, ownerId: string) =>
    queryOptions({
      queryKey: cartKeys.coupons(owner === "user" ? ownerId : "guest"),
      queryFn: ({ signal }) => getAvailableCoupons(owner, signal),
      staleTime: STALE.cart,
    }),
}
