import type { ClientSession } from "mongoose"
import { Types } from "mongoose"
import { Category } from "../categories/category.model.js"
import { Product } from "../products/product.model.js"
import { Deal } from "./deal.model.js"

type DealDoc = {
  _id: Types.ObjectId
  product: Types.ObjectId
  dealPrice: number
  startsAt: Date
  endsAt: Date
  stockLimit: number
  claimed: number
  badge?: string | null
}

export type DealInfo = {
  id: string
  dealPrice: number
  startsAt: Date
  endsAt: Date
  stockLimit: number
  claimed: number
  remaining: number
  badge: string | null
}

const toInfo = (d: DealDoc): DealInfo => ({
  id: String(d._id),
  dealPrice: d.dealPrice,
  startsAt: d.startsAt,
  endsAt: d.endsAt,
  stockLimit: d.stockLimit,
  claimed: d.claimed,
  remaining: Math.max(0, d.stockLimit - d.claimed),
  badge: d.badge ?? null,
})

/**
 * The live deal (if any) per product: started, not ended, switched on, units left. When two
 * overlap, the cheapest wins. Keys of the returned map are product ids as strings.
 */
export async function liveDeals(
  productIds: unknown[],
  now = new Date(),
  session?: ClientSession
) {
  const map = new Map<string, DealInfo>()
  if (!productIds.length) return map
  const docs = await Deal.find({
    product: { $in: productIds.map((id) => new Types.ObjectId(String(id))) },
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
    $expr: { $lt: ["$claimed", "$stockLimit"] },
  })
    .session(session ?? null)
    .lean<DealDoc[]>()
  for (const d of docs) {
    const prev = map.get(String(d.product))
    if (!prev || d.dealPrice < prev.dealPrice) map.set(String(d.product), toInfo(d))
  }
  return map
}

/** Add `deal` (or null) to product list/detail rows. */
export async function attachDeals<T extends { _id: unknown }>(rows: T[]) {
  const deals = await liveDeals(rows.map((r) => r._id))
  return rows.map((r) => ({ ...r, deal: deals.get(String(r._id)) ?? null }))
}

/** Active (or upcoming) deals with product summaries, for the /deals page and the home strip. */
export async function listDeals(opts: {
  status: "active" | "upcoming"
  category?: string
  limit: number
  now?: Date
}) {
  const now = opts.now ?? new Date()
  const timeFilter =
    opts.status === "active"
      ? { startsAt: { $lte: now }, endsAt: { $gt: now } }
      : { startsAt: { $gt: now } }
  let productFilter: Record<string, unknown> = { status: "active" }
  if (opts.category) {
    const cat = await Category.findOne({ slug: opts.category }).select("_id").lean()
    if (!cat) return []
    productFilter = { ...productFilter, categoryPath: cat._id }
  }
  const products = await Product.find(productFilter, {
    name: 1,
    slug: 1,
    brand: 1,
    images: 1,
    price: 1,
    mrp: 1,
    stock: 1,
    category: 1,
    ratingAvg: 1,
    ratingCount: 1,
  })
    .populate("category", "name slug")
    .lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const deals = await Deal.find({
    isActive: true,
    ...timeFilter,
    product: { $in: products.map((p) => p._id) },
    ...(opts.status === "active" ? { $expr: { $lt: ["$claimed", "$stockLimit"] } } : {}),
  })
    .sort({ endsAt: 1, _id: 1 })
    .limit(opts.limit)
    .lean<DealDoc[]>()
  return deals.flatMap((d) => {
    const p = byId.get(String(d.product))
    if (!p) return []
    return [
      {
        ...toInfo(d),
        status: opts.status,
        product: {
          id: String(p._id),
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          imageUrl: p.images?.[0]?.url ?? null,
          price: p.price,
          mrp: p.mrp,
          stock: p.stock,
          category: p.category,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
        },
        discountPercent:
          p.mrp > 0 ? Math.round(((p.mrp - d.dealPrice) / p.mrp) * 100) : 0,
      },
    ]
  })
}
