import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { qk } from "@/lib/queryKeys"
import * as api from "./api"

// A dashboard is read-mostly: results stay fresh for a minute (no refetch on every mount) and the
// numbers refresh on their own every 2 minutes while the tab is open. `keepPreviousData` keeps the
// old chart on screen while a new range loads (no empty flash); `staleTime` means an identical
// request is not repeated.
const common = {
  staleTime: 60_000,
  refetchInterval: 120_000,
  placeholderData: keepPreviousData,
} as const

const mk = <T>(
  name: string,
  params: object,
  fn: (s: AbortSignal) => Promise<T>
) =>
  queryOptions({
    queryKey: qk.analytics.one(name, params),
    queryFn: ({ signal }) => fn(signal),
    ...common,
  })

export const overviewOptions = (r: api.RangeParams) =>
  mk("overview", r, (s) => api.getOverview(r, s))
export const revenueOptions = (r: api.RangeParams) =>
  mk("revenue", r, (s) => api.getRevenue(r, s))
export const statusOptions = (r: api.RangeParams) =>
  mk("statuses", r, (s) => api.getStatuses(r, s))
export const topProductsOptions = (r: api.RangeParams) =>
  mk("top-products", r, (s) => api.getTopProducts(r, s))
export const categoryShareOptions = (r: api.RangeParams) =>
  mk("category-share", r, (s) => api.getCategoryShare(r, s))
export const lowStockOptions = () =>
  mk("low-stock", {}, (s) => api.getLowStock(s))
export const funnelOptions = (r: api.RangeParams) =>
  mk("funnel", r, (s) => api.getFunnel(r, s))
