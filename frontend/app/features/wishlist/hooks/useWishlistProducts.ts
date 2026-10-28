import { useQuery } from "@tanstack/react-query"

import { toAsyncState } from "@/lib/queryState"

import { wishlistQueries } from "../queries"

/**
 * The full products for the /wishlist page. Which of them are STILL wishlisted is decided
 * by the ids query (`useWishlist`), not by this list: that is what makes remove instant
 * and a failed remove reappear.
 */
export const useWishlistProducts = () =>
  toAsyncState(useQuery(wishlistQueries.list()))
