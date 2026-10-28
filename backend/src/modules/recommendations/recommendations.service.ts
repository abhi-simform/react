import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Category } from "../categories/category.model.js"
import { attachDeals } from "../deals/deal.service.js"
import { Order } from "../orders/order.model.js"
import { Product } from "../products/product.model.js"
import { findActiveProduct } from "../products/product.service.js"
import { WishlistItem } from "../wishlist/wishlist.model.js"
import { RECENTLY_VIEWED_CAP, RecentlyViewed } from "./recentlyViewed.model.js"

/** The list-card shape: same fields as GET /products rows (no description/specs/highlights). */
const CARD = { description: 0, specs: 0, highlights: 0 } as const
const oid = (id: unknown) => new Types.ObjectId(String(id))

async function cards(ids: unknown[]) {
  if (!ids.length) return []
  const rows = await Product.find({ _id: { $in: ids.map(oid) }, status: "active" }, CARD)
    .populate("category", "name slug")
    .lean()
  const byId = new Map(rows.map((r) => [String(r._id), r]))
  // Keep the caller's ranking; drop anything that is no longer active.
  const ordered = ids.flatMap((id) => {
    const r = byId.get(String(id))
    return r ? [r] : []
  })
  return attachDeals(ordered)
}

// ---- recently viewed -------------------------------------------------------------------------

/** Upsert views (viewedAt only ever moves forward), then trim to the newest RECENTLY_VIEWED_CAP. */
export async function recordViews(
  userId: string,
  items: { productId: string; viewedAt?: Date }[]
) {
  const now = new Date()
  const active = new Set(
    (
      await Product.find(
        { _id: { $in: items.map((i) => oid(i.productId)) }, status: "active" },
        { _id: 1 }
      ).lean()
    ).map((p) => String(p._id))
  )
  const ops = items
    .filter((i) => active.has(i.productId))
    .map((i) => ({
      updateOne: {
        filter: { user: oid(userId), product: oid(i.productId) },
        // A client clock in the future must not pin an item to the top forever.
        update: {
          $max: { viewedAt: i.viewedAt && i.viewedAt < now ? i.viewedAt : now },
          $setOnInsert: { user: oid(userId), product: oid(i.productId) },
        },
        upsert: true,
      },
    }))
  if (!ops.length) return { recorded: 0 }
  await RecentlyViewed.bulkWrite(ops, { ordered: false })
  const stale = await RecentlyViewed.find({ user: userId })
    .sort({ viewedAt: -1, _id: -1 })
    .skip(RECENTLY_VIEWED_CAP)
    .select("_id")
    .lean()
  if (stale.length)
    await RecentlyViewed.deleteMany({ _id: { $in: stale.map((s) => s._id) } })
  return { recorded: ops.length }
}

export async function listViewed(userId: string, limit: number) {
  const rows = await RecentlyViewed.find({ user: userId })
    .sort({ viewedAt: -1, _id: -1 })
    .limit(limit + 10) // a few spares: archived products are skipped
    .lean()
  return (await cards(rows.map((r) => r.product))).slice(0, limit)
}

export const clearViewed = (userId: string) => RecentlyViewed.deleteMany({ user: userId })

// ---- similar / also bought -------------------------------------------------------------------

/** Same neighbourhood of the catalog, ranked by brand match, price closeness and rating. */
export async function similarProducts(idOrSlug: string, limit: number) {
  const base = await findActiveProduct(idOrSlug)
  // Candidates: the product's own category first; if that is a thin leaf, its parent's subtree.
  const path = base.categoryPath ?? []
  const parent = path.length >= 2 ? path[path.length - 2] : null
  const candidates = await Product.find(
    {
      status: "active",
      _id: { $ne: base._id },
      categoryPath: { $in: parent ? [base.category, parent] : [base.category] },
    },
    CARD
  )
    .sort({ soldCount: -1, _id: 1 })
    .limit(120)
    .populate("category", "name slug")
    .lean()
  const score = (p: (typeof candidates)[number]) => {
    const priceGap = Math.min(1, Math.abs(p.price - base.price) / Math.max(1, base.price))
    return (
      (String(p.category && (p.category as { _id: unknown })._id) ===
      String(base.category)
        ? 3
        : 0) +
      (p.brand.toLowerCase() === base.brand.toLowerCase() ? 1.5 : 0) +
      (1 - priceGap) * 2 +
      p.ratingAvg / 5
    )
  }
  const top = candidates
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || String(a.p._id).localeCompare(String(b.p._id)))
    .slice(0, limit)
    .map((x) => x.p)
  return attachDeals(top)
}

/**
 * "Customers also bought": products that appear in the same (paid-for) orders, most frequent first.
 * When real co-purchases are fewer than `limit` the rail is topped up with similar products and
 * `source` says so ("orders" | "mixed" | "similar"), so the UI can label it honestly.
 */
export async function alsoBought(idOrSlug: string, limit: number) {
  const base = await findActiveProduct(idOrSlug)
  const rows = await Order.aggregate<{ _id: Types.ObjectId; orders: number }>([
    {
      $match: {
        "items.product": base._id,
        status: { $nin: ["pending_payment", "cancelled"] },
      },
    },
    { $unwind: "$items" },
    { $match: { "items.product": { $ne: base._id } } },
    { $group: { _id: "$items.product", orders: { $addToSet: "$_id" } } },
    { $project: { orders: { $size: "$orders" } } },
    { $sort: { orders: -1, _id: 1 } },
    { $limit: limit * 2 },
  ])
  const bought = await cards(rows.map((r) => r._id))
  const items = bought.slice(0, limit)
  if (items.length >= limit) return { items, source: "orders" as const }
  const have = new Set(items.map((i) => String(i._id)))
  const fill = (await similarProducts(String(base._id), limit * 2))
    .filter((p) => !have.has(String(p._id)))
    .slice(0, limit - items.length)
  return {
    items: [...items, ...fill],
    source: items.length ? ("mixed" as const) : ("similar" as const),
  }
}

// ---- trending / for you ----------------------------------------------------------------------

export async function trending(limit: number, categorySlug?: string) {
  const filter: Record<string, unknown> = { status: "active", stock: { $gt: 0 } }
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug }).select("_id").lean()
    if (!cat) return []
    filter.categoryPath = cat._id
  }
  const rows = await Product.find(filter, CARD)
    .sort({ soldCount: -1, ratingAvg: -1, _id: 1 })
    .limit(limit)
    .populate("category", "name slug")
    .lean()
  return attachDeals(rows)
}

type Affinity = Map<string, number>
const bump = (m: Affinity, key: string, w: number) => m.set(key, (m.get(key) ?? 0) + w)

/**
 * Personalised home row. Signals (weighted): purchases 3, wishlist 2, recently viewed 1, each
 * contributing to a category and a brand affinity. Candidates from the top categories are scored by
 * affinity + quality, minus what the shopper already bought or just looked at. No signal at all
 * (new account, guest without a local list) falls back to trending, with `personalised: false`.
 */
export async function forYou(userId: string | null, seed: string[], limit: number) {
  const signals: { product: unknown; w: number }[] = []
  const exclude = new Set<string>()
  if (userId) {
    const [orders, wish, viewed] = await Promise.all([
      Order.find({ user: userId, status: { $nin: ["pending_payment", "cancelled"] } })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("items.product")
        .lean(),
      WishlistItem.find({ user: userId }).limit(30).lean(),
      RecentlyViewed.find({ user: userId }).sort({ viewedAt: -1 }).limit(20).lean(),
    ])
    for (const o of orders)
      for (const i of o.items) {
        signals.push({ product: i.product, w: 3 })
        exclude.add(String(i.product))
      }
    for (const w of wish) signals.push({ product: w.product, w: 2 })
    for (const v of viewed) {
      signals.push({ product: v.product, w: 1 })
      exclude.add(String(v.product))
    }
  }
  for (const id of seed) {
    signals.push({ product: id, w: 1 })
    exclude.add(id)
  }
  if (!signals.length)
    return { items: await trending(limit), personalised: false, basedOn: [] as string[] }

  const known = await Product.find(
    { _id: { $in: signals.map((s) => oid(s.product)) } },
    { category: 1, brand: 1, name: 1 }
  ).lean()
  const byId = new Map(known.map((p) => [String(p._id), p]))
  const cat: Affinity = new Map()
  const brand: Affinity = new Map()
  for (const s of signals) {
    const p = byId.get(String(s.product))
    if (!p) continue
    bump(cat, String(p.category), s.w)
    bump(brand, p.brand.toLowerCase(), s.w)
  }
  const topCats = [...cat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  if (!topCats.length)
    return { items: await trending(limit), personalised: false, basedOn: [] as string[] }
  const maxCat = topCats[0]![1]
  const maxBrand = Math.max(1, ...brand.values())

  const candidates = await Product.find(
    {
      status: "active",
      stock: { $gt: 0 },
      category: { $in: topCats.map(([id]) => oid(id)) },
      _id: { $nin: [...exclude].map(oid) },
    },
    CARD
  )
    .sort({ soldCount: -1, _id: 1 })
    .limit(150)
    .populate("category", "name slug")
    .lean()
  const ranked = candidates
    .map((p) => {
      const catId = String((p.category as unknown as { _id: unknown })._id)
      const s =
        ((cat.get(catId) ?? 0) / maxCat) * 3 +
        ((brand.get(p.brand.toLowerCase()) ?? 0) / maxBrand) * 2 +
        p.ratingAvg / 5
      return { p, s }
    })
    .sort((a, b) => b.s - a.s || String(a.p._id).localeCompare(String(b.p._id)))
    .slice(0, limit)
    .map((x) => x.p)
  const catNames = await Category.find({ _id: { $in: topCats.map(([id]) => oid(id)) } })
    .select("name")
    .lean()
  return {
    items: await attachDeals(ranked),
    personalised: true,
    basedOn: catNames.map((c) => c.name),
  }
}

// ---- compare ---------------------------------------------------------------------------------

/**
 * Compare data, aligned for a table: one row per spec key (union across products, first-seen order),
 * `values[i]` belongs to `products[i]` (null where a product lacks the spec), `differs` marks rows
 * worth highlighting. Missing/inactive ids are 404 (a compare list should be cleaned, not guessed).
 */
export async function compareProducts(ids: string[]) {
  const unique = [...new Set(ids)]
  const rows = await Product.find({ _id: { $in: unique.map(oid) }, status: "active" })
    .populate("category", "name slug")
    .lean()
  if (rows.length !== unique.length)
    throw ApiError.notFound("One or more products were not found")
  const byId = new Map(rows.map((r) => [String(r._id), r]))
  const products = unique.map((id) => byId.get(id)!)
  const withDeals = await attachDeals(products)
  const keys: string[] = []
  for (const p of products)
    for (const s of p.specs ?? []) if (s.key && !keys.includes(s.key)) keys.push(s.key)
  const specRows = keys.map((key) => {
    const values = products.map(
      (p) => (p.specs ?? []).find((s) => s.key === key)?.value ?? null
    )
    return { key, values, differs: new Set(values).size > 1 }
  })
  return {
    products: withDeals.map((p) => ({
      id: String(p._id),
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.price,
      mrp: p.mrp,
      discountPercent: p.discountPercent,
      image: p.images[0]?.url ?? null,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      stock: p.stock,
      category: p.category,
      highlights: p.highlights ?? [],
      deal: p.deal,
    })),
    specs: specRows,
  }
}
