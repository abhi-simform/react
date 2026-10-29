import { z } from "@/lib/zod"

import { api } from "@/lib/api/client"

import { dealSchema, timeSchema, type DealsFilter } from "./schemas"

/** Active (or upcoming) deals. (`meta.now` exists too; the offset comes from `/time`, see below.) */
export const getDeals = (filter: DealsFilter, signal?: AbortSignal) =>
  api("/deals", {
    query: {
      status: filter.status,
      category: filter.category,
      limit: filter.limit,
    },
    schema: z.array(dealSchema),
    signal,
  })

/**
 * The offset between the server's clock and this browser's: `serverTime - clientTime`. The
 * client time is taken at the MIDDLE of the request (half the round trip), so a slow network
 * does not skew it. Add the offset to `Date.now()` to get "server now".
 */
export async function measureServerOffset(
  signal?: AbortSignal
): Promise<number> {
  const sentAt = Date.now()
  const time = await api("/time", { schema: timeSchema, signal })
  const receivedAt = Date.now()
  return time.epochMs - (sentAt + receivedAt) / 2
}
