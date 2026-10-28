import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Product } from "../products/product.model.js"
import { WishlistItem } from "./wishlist.model.js"

/** Just the product ids, newest first. The UI loads this once to paint every heart. */
export async function listIds(userId: string) {
  const rows = await WishlistItem.find({ user: userId })
    .sort({ createdAt: -1, _id: 1 })
    .lean()
  return rows.map((r) => String(r.product))
}

/** Full list (product card shape) with pagination. Archived/draft products are hidden. */
export async function list(userId: string, page: number, limit: number) {
  const rows = await WishlistItem.find({ user: userId })
    .sort({ createdAt: -1, _id: 1 })
    .lean()
  const products = await Product.find(
    { _id: { $in: rows.map((r) => r.product) }, status: "active" },
    { description: 0, specs: 0, highlights: 0 }
  )
    .populate("category", "name slug")
    .lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const visible = rows.flatMap((r) => {
    const p = byId.get(String(r.product))
    return p ? [{ ...p, wishlistedAt: r.createdAt }] : []
  })
  return { items: visible.slice((page - 1) * limit, page * limit), total: visible.length }
}

/**
 * Idempotent add. Returns `created: false` when it was already there, so POST twice is safe
 * (201 first time, 200 afterwards) and a double click can never create a duplicate.
 */
export async function add(userId: string, productId: string) {
  const exists = await Product.exists({ _id: productId, status: "active" })
  if (!exists) throw ApiError.notFound("Product not found")
  const res = await WishlistItem.updateOne(
    { user: userId, product: new Types.ObjectId(productId) },
    { $setOnInsert: { user: userId, product: productId } },
    { upsert: true }
  )
  return { productId, created: res.upsertedCount === 1 }
}

/** Idempotent remove: removing something that is not there is still a success (204). */
export async function remove(userId: string, productId: string) {
  await WishlistItem.deleteOne({ user: userId, product: productId })
}
