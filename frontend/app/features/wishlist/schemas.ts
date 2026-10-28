import { z } from "zod"

/**
 * `GET /wishlist` item: the product CARD shape plus when it was added. Declared here
 * instead of extending catalog's `productSchema` on purpose: catalog's ProductCard
 * imports the wishlist heart, so importing catalog here would create a feature cycle.
 * (A schema for the same list contract in two places is the price; Stage 9 query
 * factories will make this less awkward.)
 */
export const wishlistProductSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  brand: z.string(),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100),
  images: z.array(z.object({ url: z.url(), alt: z.string().optional() })),
  stock: z.number().int().nonnegative(),
  ratingAvg: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  wishlistedAt: z.iso.datetime(),
})
export type WishlistProduct = z.infer<typeof wishlistProductSchema>
