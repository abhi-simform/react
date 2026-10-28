import { z } from "zod"

import { api, apiPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"

import { wishlistProductSchema, type WishlistProduct } from "./schemas"

/** Just the ids (cheap): one call paints every heart in the app. */
export const getWishlistIds = (signal?: AbortSignal): Promise<string[]> =>
  api("/wishlist/ids", { schema: z.array(z.string()), auth: true, signal })

export const getWishlist = (
  page = 1,
  limit = 60,
  signal?: AbortSignal
): Promise<Paginated<WishlistProduct>> =>
  apiPaginated("/wishlist", {
    query: { page, limit },
    schema: wishlistProductSchema,
    auth: true,
    signal,
  })

/** Idempotent on the server (201, then 200): safe to retry. */
export const addToWishlist = (productId: string): Promise<void> =>
  api("/wishlist", {
    method: "POST",
    body: { productId },
    schema: z.object({ productId: z.string() }).transform(() => undefined),
    auth: true,
  })

/** Idempotent on the server (204 every time). */
export const removeFromWishlist = (productId: string): Promise<void> =>
  api(`/wishlist/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    auth: true,
  })
