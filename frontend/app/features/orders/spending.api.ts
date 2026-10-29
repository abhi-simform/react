import { api } from "@/lib/api/client"
import { z } from "@/lib/zod"

/** `GET /me/spending?months=6` (B11): what the signed-in shopper spent per month on orders that really sold. */
export const spendingSchema = z.object({
  months: z.number(),
  total: z.number(),
  orders: z.number(),
  points: z.array(
    z.object({ month: z.string(), spent: z.number(), orders: z.number() })
  ),
})
export type Spending = z.infer<typeof spendingSchema>

export const getSpending = (
  months: number,
  signal?: AbortSignal
): Promise<Spending> =>
  api("/me/spending", {
    auth: true,
    query: { months },
    schema: spendingSchema,
    signal,
  })
