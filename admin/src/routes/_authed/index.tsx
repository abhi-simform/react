import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Dashboard, toRange } from "@/features/analytics/Dashboard"
import {
  categoryShareOptions,
  overviewOptions,
  revenueOptions,
  statusOptions,
  topProductsOptions,
} from "@/features/analytics/queries"
import { can } from "@/lib/auth/can"
import { requirePermission } from "@/lib/auth/guards"

const day = z.iso.date().optional().catch(undefined)

// The range lives in the URL: a preset (`days`) or an explicit `from`/`to` (India days). Garbage values
// fall back to the default; `from > to` is swapped away by dropping `to`.
const searchSchema = z
  .object({
    days: z.coerce.number().int().min(1).max(366).default(30).catch(30),
    from: day,
    to: day,
  })
  .transform((s) =>
    s.from && s.to && s.to < s.from ? { ...s, to: undefined } : s
  )

export const Route = createFileRoute("/_authed/")({
  staticData: { crumb: "Dashboard" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "dashboard:view"),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Warm the cache while the route transitions (the same keys the page's useQuery uses).
    if (!can(context.user, "dashboard:view")) return
    const r = toRange(deps)
    const qc = context.queryClient
    void qc.prefetchQuery(overviewOptions(r))
    void qc.prefetchQuery(revenueOptions(r))
    void qc.prefetchQuery(statusOptions(r))
    void qc.prefetchQuery(topProductsOptions(r))
    void qc.prefetchQuery(categoryShareOptions(r))
  },
  component: Dashboard,
})
