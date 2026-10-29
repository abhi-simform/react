import { api } from "@/lib/api/client"
import { getUser } from "@/lib/auth/session"

// Admins read the platform-wide endpoints; sellers read the SAME shapes from /seller/analytics, which
// the API pins to their own products (a seller never sees another seller's numbers or the funnel).
const base = () =>
  getUser()?.role === "admin" ? "/admin/analytics" : "/seller/analytics"

/** The dashboard range: a preset (`days`) or explicit `from`..`to` (India calendar days). */
export type RangeParams = { days?: number; from?: string; to?: string }

export type Kpi = { value: number; previous: number; deltaPct: number | null }
export type Overview = {
  range: { from: string; to: string; days: number }
  revenue: Kpi
  orders: Kpi
  averageOrderValue: Kpi
  unitsSold: Kpi
  newCustomers: Kpi | null
  attention: {
    toShip: number
    returnsOpen: number
    lowStock: number
    lowStockThreshold: number
  }
}
export type RevenuePoint = { date: string; revenue: number; orders: number }
export type RevenueSeries = { total: number; points: RevenuePoint[] }
export type StatusCount = { status: string; count: number; amount: number }
export type TopProduct = {
  productId: string
  name: string
  revenue: number
  units: number
  stock: number
}
export type CategoryShare = {
  categoryId: string
  name: string
  revenue: number
  sharePct: number
}
export type LowStock = {
  threshold: number
  total: number
  items: {
    productId: string
    name: string
    sku: string
    stock: number
    soldCount: number
  }[]
}
export type Funnel = {
  steps: {
    key: string
    label: string
    count: number
    ofPrevious: number | null
    ofFirst: number | null
  }[]
}

export const getOverview = (r: RangeParams, signal?: AbortSignal) =>
  api<Overview>(`${base()}/overview`, { query: r, signal })
export const getRevenue = (r: RangeParams, signal?: AbortSignal) =>
  api<RevenueSeries>(`${base()}/revenue`, { query: r, signal })
export const getStatuses = (r: RangeParams, signal?: AbortSignal) =>
  api<StatusCount[]>(`${base()}/orders-by-status`, { query: r, signal })
export const getTopProducts = (r: RangeParams, signal?: AbortSignal) =>
  api<TopProduct[]>(`${base()}/top-products`, {
    query: { ...r, limit: 6 },
    signal,
  })
export const getCategoryShare = (r: RangeParams, signal?: AbortSignal) =>
  api<CategoryShare[]>(`${base()}/category-share`, { query: r, signal })
export const getLowStock = (signal?: AbortSignal) =>
  api<LowStock>(`${base()}/low-stock`, { query: { limit: 8 }, signal })
export const getFunnel = (r: RangeParams, signal?: AbortSignal) =>
  api<Funnel>("/admin/analytics/funnel", { query: r, signal })
