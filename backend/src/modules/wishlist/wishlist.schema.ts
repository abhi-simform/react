import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const addWishlistSchema = { body: z.object({ productId: objectId }) }
export const removeWishlistSchema = { params: z.object({ productId: objectId }) }
export const listWishlistSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(20),
  }),
}
