import { useFetch } from "@/hooks/useFetch"

import { getWishlist } from "../api"

/**
 * The full products for the /wishlist page. Which of them are STILL wishlisted is decided
 * by the shared Set (`useWishlist`), not by this list: that is what makes remove instant
 * and a failed remove reappear.
 */
export const useWishlistProducts = () =>
  useFetch((signal) => getWishlist(1, 60, signal), [1])
