import { isValidObjectId } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Category } from "../categories/category.model.js"
import { Product } from "./product.model.js"
import type { z } from "zod"
import type { listProductsSchema } from "./product.schema.js"

type ListQuery = z.output<typeof listProductsSchema.query>

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function listProducts(q: ListQuery) {
  const filter: Record<string, unknown> = { status: "active" }

  if (q.search) filter.$text = { $search: q.search }
  if (q.brand?.length)
    filter.brand = { $in: q.brand.map((b) => new RegExp(`^${escapeRegex(b)}$`, "i")) }
  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {
      ...(q.minPrice != null ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice != null ? { $lte: q.maxPrice } : {}),
    }
  }
  if (q.minRating != null) filter.ratingAvg = { $gte: q.minRating }
  if (q.minDiscount != null) filter.discountPercent = { $gte: q.minDiscount }
  if (q.inStock) filter.stock = { $gt: 0 }
  if (q.featured != null) filter.isFeatured = q.featured

  if (q.category) {
    const cat = await Category.findOne({ slug: q.category }).select("_id").lean()
    if (!cat) return { items: [], total: 0 } // unknown category => empty result, not an error
    filter.categoryPath = cat._id
  }

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
  return { items, total }
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
