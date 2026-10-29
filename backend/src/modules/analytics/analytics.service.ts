import { Types, type PipelineStage } from "mongoose"
import { Cart } from "../cart/cart.model.js"
import { Category } from "../categories/category.model.js"
import { Order, type OrderStatus } from "../orders/order.model.js"
import { Product } from "../products/product.model.js"
import { RecentlyViewed } from "../recommendations/recentlyViewed.model.js"
import { User } from "../users/user.model.js"
import { getSettings } from "../system/settings.service.js"

/**
 * Admin and seller analytics: aggregation pipelines over orders.
 *
 * - A "scope" is `{}` for the whole platform (admin) or `{ sellerId }`: then only order LINES whose
 *   product belongs to that seller count, and an order's amount is the sum of those lines
 *   (a seller never sees the order total, shipping or another seller's lines).
 * - Revenue counts orders that are really sold: not unpaid, cancelled, returned or refunded.
 * - Days are India calendar days (UTC+5:30, no DST), because that is when the shop "closes".
 * - Money is whole rupees, like everywhere else in the API.
 */
export type Scope = { sellerId?: string }
export type Range = { from: Date; to: Date; days: number }

export const SOLD_STATUSES: OrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "return_requested",
]

const IST_MS = 330 * 60_000
const DAY_MS = 86_400_000
const TZ = "Asia/Kolkata"

/** "YYYY-MM-DD" of an instant, as seen in India. */
const istDay = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10)
/** The instant an India calendar day starts. */
const istStart = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00.000Z`) - IST_MS)

export function resolveRange(
  q: { days?: number; from?: string; to?: string },
  now = new Date()
): Range {
  const toDay = q.to ?? istDay(now)
  const to = new Date(istStart(toDay).getTime() + DAY_MS) // exclusive end
  let from: Date
  if (q.from) from = istStart(q.from)
  else from = new Date(to.getTime() - (q.days ?? 30) * DAY_MS)
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS))
  return { from, to, days }
}
const previous = (r: Range): Range => ({
  from: new Date(r.from.getTime() - r.days * DAY_MS),
  to: r.from,
  days: r.days,
})

type Prep = { match: Record<string, unknown>; amount: unknown; units: unknown }

/** Per-scope building blocks: the order match and the expressions for "what this scope earned". */
async function prep(scope: Scope): Promise<Prep> {
  if (!scope.sellerId)
    return {
      match: {},
      amount: "$pricing.total",
      units: { $sum: "$items.qty" },
    }
  const ids = await Product.distinct("_id", {
    seller: new Types.ObjectId(scope.sellerId),
  })
  const mine = {
    $filter: { input: "$items", as: "i", cond: { $in: ["$$i.product", ids] } },
  }
  return {
    match: { "items.product": { $in: ids } },
    amount: { $sum: { $map: { input: mine, as: "i", in: "$$i.lineTotal" } } },
    units: { $sum: { $map: { input: mine, as: "i", in: "$$i.qty" } } },
  }
}

const inRange = (r: Range) => ({ createdAt: { $gte: r.from, $lt: r.to } })
const pct = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 1000) / 10

async function totals(r: Range, p: Prep) {
  const [row] = await Order.aggregate<{ revenue: number; orders: number; units: number }>(
    [
      { $match: { ...p.match, ...inRange(r), status: { $in: SOLD_STATUSES } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: p.amount },
          orders: { $sum: 1 },
          units: { $sum: p.units as never },
        },
      },
    ]
  )
  return { revenue: row?.revenue ?? 0, orders: row?.orders ?? 0, units: row?.units ?? 0 }
}

export async function overview(range: Range, scope: Scope) {
  const p = await prep(scope)
  const prevRange = previous(range)
  const [cur, prev] = await Promise.all([totals(range, p), totals(prevRange, p)])
  const aov = cur.orders ? Math.round(cur.revenue / cur.orders) : 0
  const prevAov = prev.orders ? Math.round(prev.revenue / prev.orders) : 0
  const threshold = (await getSettings()).lowStockThreshold
  const productScope = scope.sellerId
    ? { seller: new Types.ObjectId(scope.sellerId) }
    : {}
  const [toShip, returnsOpen, lowStock, newCustomers] = await Promise.all([
    Order.countDocuments({ ...p.match, status: "placed" }),
    scope.sellerId ? 0 : Order.countDocuments({ "returnRequest.status": "requested" }),
    Product.countDocuments({
      ...productScope,
      status: "active",
      stock: { $lte: threshold },
    }),
    scope.sellerId ? null : User.countDocuments({ role: "customer", ...inRange(range) }),
  ])
  const prevCustomers = scope.sellerId
    ? null
    : await User.countDocuments({ role: "customer", ...inRange(prevRange) })
  const kpi = (value: number, prevValue: number) => ({
    value,
    previous: prevValue,
    deltaPct: pct(value, prevValue),
  })
  return {
    range: { from: range.from, to: range.to, days: range.days },
    revenue: kpi(cur.revenue, prev.revenue),
    orders: kpi(cur.orders, prev.orders),
    averageOrderValue: kpi(aov, prevAov),
    unitsSold: kpi(cur.units, prev.units),
    newCustomers: newCustomers === null ? null : kpi(newCustomers, prevCustomers ?? 0),
    attention: { toShip, returnsOpen, lowStock, lowStockThreshold: threshold },
  }
}

export async function revenueSeries(range: Range, scope: Scope) {
  const p = await prep(scope)
  const rows = await Order.aggregate<{ _id: string; revenue: number; orders: number }>([
    { $match: { ...p.match, ...inRange(range), status: { $in: SOLD_STATUSES } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
        revenue: { $sum: p.amount },
        orders: { $sum: 1 },
      },
    },
  ])
  const byDay = new Map(rows.map((r) => [r._id, r]))
  // Fill the empty days with zeros so a chart's x axis has no holes.
  const points: { date: string; revenue: number; orders: number }[] = []
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY_MS) {
    const date = istDay(new Date(t))
    const r = byDay.get(date)
    points.push({ date, revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 })
  }
  return {
    range: { from: range.from, to: range.to, days: range.days },
    total: points.reduce((n, x) => n + x.revenue, 0),
    points,
  }
}

export async function ordersByStatus(range: Range, scope: Scope) {
  const p = await prep(scope)
  const rows = await Order.aggregate<{ _id: OrderStatus; count: number; amount: number }>(
    [
      { $match: { ...p.match, ...inRange(range) } },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: p.amount } } },
      { $sort: { count: -1, _id: 1 } },
    ]
  )
  return rows.map((r) => ({ status: r._id, count: r.count, amount: r.amount }))
}

export async function topProducts(
  range: Range,
  scope: Scope,
  opts: { limit: number; by: "revenue" | "units" }
) {
  const sellerIds = scope.sellerId
    ? await Product.distinct("_id", { seller: new Types.ObjectId(scope.sellerId) })
    : null
  const rows = await Order.aggregate<{
    _id: Types.ObjectId
    revenue: number
    units: number
  }>([
    {
      $match: {
        ...(sellerIds ? { "items.product": { $in: sellerIds } } : {}),
        ...inRange(range),
        status: { $in: SOLD_STATUSES },
      },
    },
    { $unwind: "$items" },
    ...(sellerIds ? [{ $match: { "items.product": { $in: sellerIds } } }] : []),
    {
      $group: {
        _id: "$items.product",
        revenue: { $sum: "$items.lineTotal" },
        units: { $sum: "$items.qty" },
      },
    },
    { $sort: { [opts.by]: -1, _id: 1 } },
    { $limit: opts.limit },
  ])
  const products = await Product.find({ _id: { $in: rows.map((r) => r._id) } })
    .select("name slug sku stock images")
    .lean()
  const byId = new Map(products.map((x) => [String(x._id), x]))
  return rows.map((r) => {
    const x = byId.get(String(r._id))
    return {
      productId: String(r._id),
      name: x?.name ?? "(deleted product)",
      slug: x?.slug ?? null,
      sku: x?.sku ?? null,
      image: x?.images?.[0]?.url ?? null,
      stock: x?.stock ?? 0,
      revenue: r.revenue,
      units: r.units,
    }
  })
}

/** Revenue per TOP-LEVEL category (a product in Phones counts for Electronics). */
export async function categoryShare(range: Range, scope: Scope) {
  const sellerIds = scope.sellerId
    ? await Product.distinct("_id", { seller: new Types.ObjectId(scope.sellerId) })
    : null
  const stages: PipelineStage[] = [
    {
      $match: {
        ...(sellerIds ? { "items.product": { $in: sellerIds } } : {}),
        ...inRange(range),
        status: { $in: SOLD_STATUSES },
      },
    },
    { $unwind: "$items" },
    ...(sellerIds ? [{ $match: { "items.product": { $in: sellerIds } } }] : []),
    { $group: { _id: "$items.product", revenue: { $sum: "$items.lineTotal" } } },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "p" } },
    { $unwind: "$p" },
    { $group: { _id: "$p.category", revenue: { $sum: "$revenue" } } },
  ]
  const perCategory = await Order.aggregate<{ _id: Types.ObjectId; revenue: number }>(
    stages
  )
  const cats = await Category.find({
    _id: { $in: perCategory.map((c) => c._id) },
  })
    .select("name ancestors")
    .lean()
  const rootIds = new Map<string, string>() // category id -> its root's id
  for (const c of cats) rootIds.set(String(c._id), String(c.ancestors[0] ?? c._id))
  const roots = await Category.find({ _id: { $in: [...new Set(rootIds.values())] } })
    .select("name slug")
    .lean()
  const rootInfo = new Map(roots.map((r) => [String(r._id), r]))
  const sums = new Map<string, number>()
  for (const c of perCategory) {
    const root = rootIds.get(String(c._id)) ?? String(c._id)
    sums.set(root, (sums.get(root) ?? 0) + c.revenue)
  }
  const total = [...sums.values()].reduce((n, v) => n + v, 0)
  return [...sums]
    .map(([id, revenue]) => ({
      categoryId: id,
      name: rootInfo.get(id)?.name ?? "Other",
      slug: rootInfo.get(id)?.slug ?? null,
      revenue,
      sharePct: total ? Math.round((revenue / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

export async function lowStock(
  scope: Scope,
  opts: { threshold?: number; limit: number }
) {
  const threshold = opts.threshold ?? (await getSettings()).lowStockThreshold
  const filter = {
    status: "active" as const,
    stock: { $lte: threshold },
    ...(scope.sellerId ? { seller: new Types.ObjectId(scope.sellerId) } : {}),
  }
  const [rows, total] = await Promise.all([
    Product.find(filter)
      .sort({ stock: 1, soldCount: -1, _id: 1 })
      .limit(opts.limit)
      .select("name sku stock soldCount images seller")
      .lean(),
    Product.countDocuments(filter),
  ])
  return {
    threshold,
    total,
    items: rows.map((p) => ({
      productId: String(p._id),
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      soldCount: p.soldCount,
      image: p.images?.[0]?.url ?? null,
    })),
  }
}

/**
 * Funnel in distinct SIGNED-IN SHOPPERS (guests are not tracked): viewed a product (recently-viewed
 * rows), had something in their cart, started checkout (placed any order), paid (the order was not
 * cancelled or left unpaid). Each stage is a subset by construction only when the data is; a stage can
 * exceed the one above it (someone ordering without a recorded view), so the UI shows rates per step.
 */
export async function funnel(range: Range) {
  const [viewed, carted, ordered, paid] = await Promise.all([
    RecentlyViewed.distinct("user", { viewedAt: { $gte: range.from, $lt: range.to } }),
    Cart.distinct("user", {
      user: { $type: "objectId" },
      "items.0": { $exists: true },
      updatedAt: { $gte: range.from, $lt: range.to },
    }),
    Order.distinct("user", inRange(range)),
    Order.distinct("user", {
      ...inRange(range),
      status: { $nin: ["pending_payment", "cancelled"] },
    }),
  ])
  const steps = [
    { key: "viewed", label: "Viewed a product", count: viewed.length },
    { key: "cart", label: "Had a cart", count: carted.length },
    { key: "checkout", label: "Started checkout", count: ordered.length },
    { key: "paid", label: "Paid", count: paid.length },
  ]
  return {
    range: { from: range.from, to: range.to, days: range.days },
    steps: steps.map((s, i) => ({
      ...s,
      ofPrevious: i === 0 ? null : pct100(s.count, steps[i - 1]!.count),
      ofFirst: i === 0 ? null : pct100(s.count, steps[0]!.count),
    })),
  }
}
const pct100 = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null)

/** The storefront's "My spending": the caller's own paid-for orders per month. */
export async function mySpending(userId: string, months: number) {
  const now = new Date()
  const monthKeys: string[] = []
  const [y, m] = istDay(now).split("-").map(Number) as [number, number]
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    monthKeys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    )
  }
  const from = istStart(`${monthKeys[0]}-01`)
  const rows = await Order.aggregate<{ _id: string; spent: number; orders: number }>([
    {
      $match: {
        user: new Types.ObjectId(userId),
        createdAt: { $gte: from },
        status: { $in: [...SOLD_STATUSES] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TZ } },
        spent: { $sum: "$pricing.total" },
        orders: { $sum: 1 },
      },
    },
  ])
  const byMonth = new Map(rows.map((r) => [r._id, r]))
  const points = monthKeys.map((month) => ({
    month,
    spent: byMonth.get(month)?.spent ?? 0,
    orders: byMonth.get(month)?.orders ?? 0,
  }))
  return {
    months,
    total: points.reduce((n, x) => n + x.spent, 0),
    orders: points.reduce((n, x) => n + x.orders, 0),
    points,
  }
}
