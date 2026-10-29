import { z } from "@/lib/zod"

/** One row of `GET /deals`. Money is whole rupees; `remaining = stockLimit - claimed`. */
export const dealSchema = z.object({
  id: z.string(),
  dealPrice: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  stockLimit: z.number().int(),
  claimed: z.number().int(),
  remaining: z.number().int(),
  badge: z.string().nullable(),
  status: z.enum(["active", "upcoming"]),
  discountPercent: z.number(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    brand: z.string(),
    imageUrl: z.string().nullable(),
    price: z.number(),
    mrp: z.number(),
    stock: z.number().int(),
    ratingAvg: z.number(),
    ratingCount: z.number().int(),
    category: z
      .object({ name: z.string(), slug: z.string() })
      .loose()
      .nullish(),
  }),
})
export type Deal = z.infer<typeof dealSchema>

export const timeSchema = z.object({ now: z.string(), epochMs: z.number() })

export type DealsFilter = {
  status?: "active" | "upcoming"
  category?: string
  limit?: number
}
