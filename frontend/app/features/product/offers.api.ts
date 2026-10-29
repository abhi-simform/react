import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"

export const offerSchema = z.object({
  code: z.string(),
  description: z.string(),
  type: z.enum(["percent", "flat"]),
  value: z.number(),
  maxDiscount: z.number().nullable(),
  minOrder: z.number(),
  expiresAt: z.string().nullable(),
})
export type Offer = z.infer<typeof offerSchema>

/** `GET /coupons/offers` (public, no cart): what exists; the cart decides whether it applies. */
export const getOffers = (signal?: AbortSignal): Promise<Offer[]> =>
  api("/coupons/offers", { schema: z.array(offerSchema), signal })
