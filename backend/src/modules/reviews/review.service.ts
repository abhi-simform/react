import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Order } from "../orders/order.model.js"
import { Product } from "../products/product.model.js"
import { isOwnUpload } from "../uploads/ownership.js"
import { User } from "../users/user.model.js"
import { Review, Vote, maskName } from "./review.model.js"

const oid = (id: string) => new Types.ObjectId(id)

async function activeProduct(productId: string) {
  const p = await Product.findOne({ _id: productId, status: "active" })
    .select("_id seller")
    .lean()
  if (!p) throw ApiError.notFound("Product not found")
  return p
}

/** "Verified purchase": the user has a DELIVERED order containing the product. */
export const hasPurchased = async (userId: string, productId: string) =>
  Boolean(
    await Order.exists({
      user: userId,
      "items.product": productId,
      deliveredAt: { $exists: true },
    })
  )

function assertOwnPhotos(photos: string[], userId: string) {
  const bad = photos.findIndex((u) => !isOwnUpload(u, userId))
  if (bad >= 0)
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed", [
      {
        in: "body",
        path: `photos.${bad}`,
        message: "Photos must be images you uploaded with POST /uploads/images",
      },
    ])
}

/** The product's headline numbers come from its PUBLISHED reviews; recomputed after every change. */
export async function recomputeRating(productId: string | Types.ObjectId) {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { product: new Types.ObjectId(String(productId)), status: "published" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ])
  await Product.updateOne(
    { _id: productId },
    {
      ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
      ratingCount: agg?.count ?? 0,
    }
  )
}

export async function summary(productId: string) {
  await activeProduct(productId)
  const rows = await Review.aggregate<{ _id: number; n: number; photos: number }>([
    { $match: { product: oid(productId), status: "published" } },
    {
      $group: {
        _id: "$rating",
        n: { $sum: 1 },
        photos: { $sum: { $cond: [{ $gt: [{ $size: "$photos" }, 0] }, 1, 0] } },
      },
    },
  ])
  const histogram: Record<"1" | "2" | "3" | "4" | "5", number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }
  let count = 0
  let sum = 0
  let withPhotos = 0
  for (const r of rows) {
    histogram[String(r._id) as keyof typeof histogram] = r.n
    count += r.n
    sum += r._id * r.n
    withPhotos += r.photos
  }
  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    histogram,
    withPhotos,
  }
}

const SORTS = {
  helpful: { helpfulCount: -1, createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  highest: { rating: -1, helpfulCount: -1, _id: -1 },
  lowest: { rating: 1, helpfulCount: -1, _id: -1 },
} as const

export async function listReviews(
  productId: string,
  q: {
    page: number
    limit: number
    sort: keyof typeof SORTS
    rating?: number
    photos?: string
  },
  viewerId?: string
) {
  await activeProduct(productId)
  const filter: Record<string, unknown> = { product: oid(productId), status: "published" }
  if (q.rating) filter.rating = q.rating
  if (q.photos === "true") filter["photos.0"] = { $exists: true }
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Review.countDocuments(filter),
  ])
  const voted = viewerId
    ? new Set(
        (
          await Vote.find({
            kind: "review",
            user: viewerId,
            target: { $in: items.map((i) => i._id) },
          })
            .select("target")
            .lean()
        ).map((v) => String(v.target))
      )
    : undefined
  return { items, total, voted }
}

/** Can this user write a review, and if not, why not? Also returns their existing review. */
export async function eligibility(userId: string, productId: string) {
  const product = await activeProduct(productId)
  const [existing, verified] = await Promise.all([
    Review.findOne({ product: productId, user: userId }),
    hasPurchased(userId, productId),
  ])
  const own = product.seller && String(product.seller) === userId
  return {
    canReview: !existing && !own,
    reason: existing ? "ALREADY_REVIEWED" : own ? "OWN_PRODUCT" : null,
    verifiedPurchase: verified,
    review: existing,
  }
}

export async function createReview(
  userId: string,
  productId: string,
  input: { rating: number; title?: string; body: string; photos: string[] }
) {
  const product = await activeProduct(productId)
  if (product.seller && String(product.seller) === userId)
    throw new ApiError(403, "OWN_PRODUCT", "You cannot review your own product")
  assertOwnPhotos(input.photos, userId)
  const user = await User.findById(userId).select("name").lean()
  if (!user) throw ApiError.unauthorized()
  try {
    const review = await Review.create({
      ...input,
      product: productId,
      user: userId,
      userName: maskName(user.name),
      verifiedPurchase: await hasPurchased(userId, productId),
    })
    await recomputeRating(productId)
    return review
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw new ApiError(
        409,
        "ALREADY_REVIEWED",
        "You have already reviewed this product. Edit your review instead"
      )
    throw err
  }
}

async function ownReview(userId: string, id: string) {
  const r = await Review.findOne({ _id: id, user: userId })
  if (!r) throw ApiError.notFound("Review not found") // someone else's looks like a missing one
  return r
}

export async function updateReview(
  userId: string,
  id: string,
  input: Partial<{ rating: number; title: string; body: string; photos: string[] }>
) {
  const r = await ownReview(userId, id)
  if (input.photos) assertOwnPhotos(input.photos, userId)
  r.set({ ...input, editedAt: new Date() })
  await r.save()
  await recomputeRating(r.product)
  return r
}

export async function deleteReview(actor: { id: string; role: string }, id: string) {
  const r =
    actor.role === "admin" ? await Review.findById(id) : await ownReview(actor.id, id)
  if (!r) throw ApiError.notFound("Review not found")
  await Promise.all([r.deleteOne(), Vote.deleteMany({ kind: "review", target: r._id })])
  await recomputeRating(r.product)
}

// ---- helpful votes ----

async function votableReview(userId: string, id: string) {
  const r = await Review.findOne({ _id: id, status: "published" })
  if (!r) throw ApiError.notFound("Review not found")
  if (String(r.user) === userId)
    throw new ApiError(403, "OWN_CONTENT", "You cannot vote on your own review")
  return r
}

/** Idempotent "set": voting twice is the same as voting once, and the counter moves only on a real change. */
export async function setHelpful(userId: string, id: string, on: boolean) {
  await votableReview(userId, id)
  if (on) {
    const res = await Vote.updateOne(
      { kind: "review", target: id, user: userId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )
    if (res.upsertedCount === 1)
      await Review.updateOne({ _id: id }, { $inc: { helpfulCount: 1 } })
  } else {
    const res = await Vote.deleteOne({ kind: "review", target: id, user: userId })
    if (res.deletedCount === 1)
      await Review.updateOne({ _id: id }, { $inc: { helpfulCount: -1 } })
  }
  const r = await Review.findById(id).select("helpfulCount").lean()
  return { helpfulCount: r?.helpfulCount ?? 0, myVote: on }
}

export async function reportReview(userId: string, id: string) {
  const r = await votableReview(userId, id)
  const res = await Review.updateOne(
    { _id: r._id, reports: { $ne: oid(userId) } },
    { $addToSet: { reports: oid(userId) }, $inc: { reportCount: 1 } }
  )
  return { reported: true, alreadyReported: res.modifiedCount === 0 }
}

// ---- moderation (admin) ----

export async function adminList(q: {
  page: number
  limit: number
  status?: string
  productId?: string
  reported?: string
}) {
  const filter: Record<string, unknown> = {}
  if (q.status) filter.status = q.status
  if (q.productId) filter.product = oid(q.productId)
  if (q.reported === "true") filter.reportCount = { $gt: 0 }
  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort(
        q.reported === "true"
          ? { reportCount: -1, createdAt: -1, _id: -1 }
          : { createdAt: -1, _id: -1 }
      )
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate<{ product: { _id: Types.ObjectId; name: string; slug: string } }>(
        "product",
        "name slug"
      )
      .lean(),
    Review.countDocuments(filter),
  ])
  return { items, total }
}

export async function moderate(
  id: string,
  status: "published" | "hidden",
  note?: string
) {
  const r = await Review.findByIdAndUpdate(
    id,
    { status, moderationNote: note },
    { returnDocument: "after" }
  )
  if (!r) throw ApiError.notFound("Review not found")
  await recomputeRating(r.product)
  return r
}
