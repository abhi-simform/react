import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { RefreshToken } from "../auth/refreshToken.model.js"
import { notify } from "../notifications/notification.service.js"
import { Order } from "../orders/order.model.js"
import { Product } from "../products/product.model.js"
import { User } from "../users/user.model.js"
import { SOLD_STATUSES } from "../analytics/analytics.service.js"
import {
  APPLICATION_STATUSES,
  SellerApplication,
  type SellerApplicationDoc,
} from "./sellerApplication.model.js"

export const toApplication = (
  a: SellerApplicationDoc,
  user?: { _id: unknown; name: string; email: string } | null
) => ({
  id: String(a._id),
  user: user
    ? { id: String(user._id), name: user.name, email: user.email }
    : { id: String(a.user) },
  businessName: a.businessName,
  gstin: a.gstin ?? null,
  phone: a.phone,
  about: a.about ?? "",
  status: a.status,
  reviewNote: a.reviewNote ?? null,
  reviewedAt: a.reviewedAt ?? null,
  createdAt: a.createdAt,
})

export async function apply(
  userId: string,
  input: { businessName: string; gstin?: string; phone: string; about: string }
) {
  const user = await User.findById(userId)
  if (!user) throw ApiError.unauthorized()
  if (user.role !== "customer")
    throw ApiError.conflict("Your account can already sell", "ALREADY_SELLER")
  try {
    const a = await SellerApplication.create({ user: userId, ...input })
    return toApplication(a.toObject() as SellerApplicationDoc)
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw ApiError.conflict(
        "You already have an application waiting for review",
        "APPLICATION_PENDING"
      )
    throw err
  }
}

/** The caller's latest application (or null): the account page shows its status. */
export async function mine(userId: string) {
  const a = await SellerApplication.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .lean<SellerApplicationDoc>()
  return a ? toApplication(a) : null
}

export async function listApplications(q: {
  status?: (typeof APPLICATION_STATUSES)[number]
  page: number
  limit: number
}) {
  const filter = q.status ? { status: q.status } : {}
  const [rows, total] = await Promise.all([
    SellerApplication.find(filter)
      // The pending queue is oldest first (longest wait on top); everything else newest first.
      .sort({ createdAt: q.status === "pending" ? 1 : -1, _id: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate<{ user: { _id: unknown; name: string; email: string } }>(
        "user",
        "name email"
      )
      .lean(),
    SellerApplication.countDocuments(filter),
  ])
  return {
    items: rows.map((a) =>
      toApplication(a as unknown as SellerApplicationDoc, a.user as never)
    ),
    total,
  }
}

export async function decide(
  actorId: string,
  id: string,
  decision: "approve" | "reject",
  note?: string
) {
  // The status guard makes a double click (or two admins) decide exactly once.
  const a = await SellerApplication.findOneAndUpdate(
    { _id: id, status: "pending" },
    {
      $set: {
        status: decision === "approve" ? "approved" : "rejected",
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    },
    { returnDocument: "after" }
  )
  if (!a) {
    const exists = await SellerApplication.exists({ _id: id })
    if (!exists) throw ApiError.notFound("Application not found")
    throw ApiError.conflict("This application was already reviewed", "ALREADY_REVIEWED")
  }
  const userId = String(a.user)
  if (decision === "approve") {
    await User.updateOne({ _id: userId, role: "customer" }, { $set: { role: "seller" } })
    // The next login carries the new role.
    await RefreshToken.updateMany(
      { user: userId, revokedAt: null },
      { revokedAt: new Date() }
    )
  }
  void notify(userId, {
    category: "account",
    type: `seller.${decision === "approve" ? "approved" : "rejected"}`,
    title:
      decision === "approve"
        ? "Your seller application was approved"
        : "Your seller application was not approved",
    body:
      decision === "approve"
        ? "Sign in again to open the seller portal."
        : (note ?? "See the review note on your account."),
    link: "/account",
    email: true,
  })
  return toApplication(a.toObject() as SellerApplicationDoc)
}

/** Seller detail for the admin: profile, application, catalog and sales numbers. */
export async function sellerDetail(id: string) {
  const user = await User.findById(id).lean()
  if (!user || user.role !== "seller") throw ApiError.notFound("Seller not found")
  const sellerId = new Types.ObjectId(id)
  const [byStatus, ids, application] = await Promise.all([
    Product.aggregate<{ _id: string; count: number }>([
      { $match: { seller: sellerId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Product.distinct("_id", { seller: sellerId }),
    SellerApplication.findOne({ user: id })
      .sort({ createdAt: -1 })
      .lean<SellerApplicationDoc>(),
  ])
  const [sales] = await Order.aggregate<{
    revenue: number
    units: number
    orders: number
  }>([
    { $match: { "items.product": { $in: ids }, status: { $in: SOLD_STATUSES } } },
    { $unwind: "$items" },
    { $match: { "items.product": { $in: ids } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$items.lineTotal" },
        units: { $sum: "$items.qty" },
        orders: { $addToSet: "$_id" },
      },
    },
    { $project: { revenue: 1, units: 1, orders: { $size: "$orders" } } },
  ])
  const count = (s: string) => byStatus.find((x) => x._id === s)?.count ?? 0
  return {
    id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    isActive: user.isActive,
    joinedAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    products: {
      total: ids.length,
      active: count("active"),
      draft: count("draft"),
      archived: count("archived"),
    },
    sales: {
      revenue: sales?.revenue ?? 0,
      units: sales?.units ?? 0,
      orders: sales?.orders ?? 0,
    },
    application: application ? toApplication(application) : null,
  }
}
