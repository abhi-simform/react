import { z } from "zod"

const day = z.iso.date() // YYYY-MM-DD, read as an India (IST) calendar day

/**
 * The range every analytics endpoint takes: either `days` (a preset ending now: 7/30/90) or an explicit
 * `from`..`to` (inclusive calendar days). `from` without `to` runs to today.
 */
export const rangeQuery = z
  .object({
    days: z.coerce.number().int().min(1).max(366).optional(),
    from: day.optional(),
    to: day.optional(),
  })
  .refine((r) => !r.from || !r.to || r.from <= r.to, {
    message: "from must not be after to",
    path: ["to"],
  })

export const overviewSchema = { query: rangeQuery }
export const revenueSchema = { query: rangeQuery }
export const statusSchema = { query: rangeQuery }
export const topProductsSchema = {
  query: rangeQuery.and(
    z.object({
      limit: z.coerce.number().int().min(1).max(20).default(5),
      by: z.enum(["revenue", "units"]).default("revenue"),
    })
  ),
}
export const categoryShareSchema = { query: rangeQuery }
export const funnelSchema = { query: rangeQuery }
export const lowStockSchema = {
  query: z.object({
    threshold: z.coerce.number().int().min(0).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
}
export const spendingSchema = {
  query: z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }),
}
