import { isValidObjectId } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Category } from "../categories/category.model.js"
import { Product } from "./product.model.js"
import type { z } from "zod"
import type { listProductsSchema } from "./product.schema.js"

type ListQuery = z.output<typeof listProductsSchema.query>

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

type FilterKey = "brand" | "price" | "rating" | "inStock"

// Builds the Mongo filter from the query. `omit` drops one facet's own filter so its counts are
// "disjunctive": ticking Apple still shows how many Samsung products match the OTHER filters.
async function buildFilter(q: ListQuery, omit?: FilterKey) {
  const filter: Record<string, unknown> = { status: "active" }

  if (q.search) filter.$text = { $search: q.search }
  if (omit !== "brand" && q.brand?.length)
    filter.brand = { $in: q.brand.map((b) => new RegExp(`^${escapeRegex(b)}$`, "i")) }
  if (omit !== "price" && (q.minPrice != null || q.maxPrice != null)) {
    filter.price = {
      ...(q.minPrice != null ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice != null ? { $lte: q.maxPrice } : {}),
    }
  }
  if (omit !== "rating" && q.minRating != null) filter.ratingAvg = { $gte: q.minRating }
  if (q.minDiscount != null) filter.discountPercent = { $gte: q.minDiscount }
  if (omit !== "inStock" && q.inStock) filter.stock = { $gt: 0 }
  if (q.featured != null) filter.isFeatured = q.featured

  if (q.category) {
    const cat = await Category.findOne({ slug: q.category }).select("_id").lean()
    if (!cat) return null // unknown category => empty result, not an error
    filter.categoryPath = cat._id
  }
  return filter
}

const RATING_STEPS = [4, 3, 2, 1]

async function computeFacets(q: ListQuery) {
  const [brandF, priceF, ratingF, stockF] = await Promise.all([
    buildFilter(q, "brand"),
    buildFilter(q, "price"),
    buildFilter(q, "rating"),
    buildFilter(q, "inStock"),
  ])
  if (!brandF || !priceF || !ratingF || !stockF)
    return {
      brands: [],
      price: { min: 0, max: 0 },
      rating: RATING_STEPS.map((value) => ({ value, count: 0 })),
      inStock: { count: 0 },
    }
  const [brands, price, ratingRows, inStock] = await Promise.all([
    Product.aggregate<{ _id: string; count: number }>([
      { $match: brandF },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Product.aggregate<{ min: number; max: number }>([
      { $match: priceF },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
    Product.aggregate<Record<string, number>>([
      { $match: ratingF },
      {
        $group: {
          _id: null,
          ...Object.fromEntries(
            RATING_STEPS.map((r) => [
              `r${r}`,
              { $sum: { $cond: [{ $gte: ["$ratingAvg", r] }, 1, 0] } },
            ])
          ),
        },
      },
    ]),
    Product.countDocuments({ ...stockF, stock: { $gt: 0 } }),
  ])
  return {
    brands: brands.map((b) => ({ value: b._id, count: b.count })),
    price: { min: price[0]?.min ?? 0, max: price[0]?.max ?? 0 },
    rating: RATING_STEPS.map((value) => ({
      value, // "value stars & up"
      count: ratingRows[0]?.[`r${value}`] ?? 0,
    })),
    inStock: { count: inStock },
  }
}

export async function listProducts(q: ListQuery) {
  const filter = await buildFilter(q)
  if (!filter)
    return { items: [], total: 0, facets: q.facets ? await computeFacets(q) : undefined }

  type Sort = Record<string, 1 | -1 | { $meta: "textScore" }>
  const sorts: Record<ListQuery["sort"], Sort> = {
    relevance: q.search ? { score: { $meta: "textScore" } } : { soldCount: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
    rating: { ratingAvg: -1, ratingCount: -1 },
    discount: { discountPercent: -1 },
    popularity: { soldCount: -1 },
  }
  // Tie-breaker keeps pagination stable when many items share the same sort value.
  const sortWithTie: Sort = { ...sorts[q.sort], _id: 1 }

  const projection = q.search ? { score: { $meta: "textScore" as const } } : {}
  const [items, total] = await Promise.all([
    Product.find(filter, { ...projection, description: 0, specs: 0, highlights: 0 })
      .sort(sortWithTie)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("category", "name slug")
      .lean(),
    Product.countDocuments(filter),
  ])
  return { items, total, facets: q.facets ? await computeFacets(q) : undefined }
}

export async function getProduct(idOrSlug: string) {
  const query = isValidObjectId(idOrSlug)
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
    : { slug: idOrSlug }
  const product = await Product.findOne({ ...query, status: "active" })
    .populate("category", "name slug")
    .populate("categoryPath", "name slug")
    .lean()
  if (!product) throw ApiError.notFound("Product not found")
  return product
}
