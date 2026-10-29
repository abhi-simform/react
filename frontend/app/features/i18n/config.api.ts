import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"
import { CURRENCIES } from "@/lib/locale"

/** `GET /config/public` (B12): display-only currency rates. Prices are stored and charged in INR. */
export const publicConfigSchema = z.object({
  baseCurrency: z.literal("INR"),
  currencies: z.record(
    z.string(),
    z.object({ rate: z.number().positive(), symbol: z.string() })
  ),
  asOf: z.string(),
})
export type PublicConfig = z.infer<typeof publicConfigSchema>

export const getPublicConfig = (signal?: AbortSignal) =>
  api("/config/public", { schema: publicConfigSchema, signal })

/** Only the currencies this UI offers, as `{ USD: 0.0119, ... }`. */
export function ratesFrom(config: PublicConfig) {
  return Object.fromEntries(
    CURRENCIES.flatMap((c) =>
      config.currencies[c] ? [[c, config.currencies[c].rate]] : []
    )
  )
}
