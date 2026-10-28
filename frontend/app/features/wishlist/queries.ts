import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { wishlistKeys } from "@/lib/queryKeys"

import { getWishlist, getWishlistIds } from "./api"

export const wishlistQueries = {
  /** Just the ids: paints every heart and the header count. */
  ids: () =>
    queryOptions({
      queryKey: wishlistKeys.ids(),
      queryFn: ({ signal }) => getWishlistIds(signal),
      staleTime: STALE.personal,
    }),
  /** The full products for the /wishlist page. */
  list: (page = 1) =>
    queryOptions({
      queryKey: wishlistKeys.list(page),
      queryFn: ({ signal }) => getWishlist(page, 60, signal),
      staleTime: STALE.personal,
    }),
}
