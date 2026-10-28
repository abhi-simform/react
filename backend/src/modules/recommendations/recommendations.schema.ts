import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const csvIds = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
  .pipe(z.array(objectId).max(30))
const limit = z.coerce.number().int().min(1).max(24).default(12)

export const recordViewsSchema = {
  body: z.object({
    // A single view is `[{ productId }]`; the post-login sync of the guest list sends several
    // with the time each was viewed. Unknown/inactive products are ignored, not errors.
    items: z
      .array(z.object({ productId: objectId, viewedAt: z.coerce.date().optional() }))
      .min(1)
      .max(30),
  }),
}
export const listViewedSchema = { query: z.object({ limit }) }
export const productRailSchema = {
  params: z.object({ idOrSlug: z.string().min(1) }),
  query: z.object({ limit }),
}
export const forYouSchema = {
  query: z.object({
    limit,
    // Guests have no server history: they may pass their local recently-viewed ids as a signal.
    seed: csvIds.optional(),
  }),
}
export const trendingSchema = {
  query: z.object({ limit, category: z.string().trim().optional() }),
}
export const compareSchema = {
  query: z.object({
    ids: csvIds.refine((a) => a.length >= 2 && a.length <= 4, "Pass 2 to 4 product ids"),
  }),
}
