import type { ClientSession } from "mongoose"
import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Order } from "../orders/order.model.js"
import { Coupon } from "./coupon.model.js"

export type CouponReason =
  | "UNKNOWN"
  | "NOT_STARTED"
  | "EXPIRED"
  | "MIN_ORDER"
  | "ALREADY_USED"
  | "NOT_APPLICABLE"
  | "EXHAUSTED"
  | "FIRST_ORDER_ONLY"
  | "EMPTY_CART"

export type PricedLine = { categoryPath: unknown[]; lineTotal: number }
export type CouponContext = {
  userId?: string
  lines: PricedLine[]
  subtotal: number
  now?: Date
  session?: ClientSession
}

type Rejected = { ok: false; reason: CouponReason; details?: Record<string, unknown> }
type Accepted = { ok: true; code: string; description: string; discount: number }
export type CouponResult = Rejected | Accepted

const MESSAGES: Record<CouponReason, string> = {
  UNKNOWN: "That coupon code does not exist",
  NOT_STARTED: "That coupon is not active yet",
  EXPIRED: "That coupon has expired",
  MIN_ORDER: "Your cart is below the minimum order for this coupon",
  ALREADY_USED: "You have already used this coupon",
  NOT_APPLICABLE: "This coupon does not apply to the items in your cart",
  EXHAUSTED: "This coupon has been fully redeemed",
  FIRST_ORDER_ONLY: "This coupon is only for your first order",
  EMPTY_CART: "Add something to your cart first",
}
export const couponMessage = (r: CouponReason) => MESSAGES[r]

/** 422 COUPON_INVALID with `details.reason` (+ extras such as `minOrder`). */
export function couponError(r: Rejected) {
  return new ApiError(422, "COUPON_INVALID", MESSAGES[r.reason], {
    reason: r.reason,
    ...r.details,
  })
}

/**
 * Decide whether `code` may be used on this cart and how much it takes off. Pure rules plus
 * two lookups (the shopper's past orders). Always run on the server, on every cart read and
 * again when the order is placed: the stored cart only remembers the CODE.
 */
export async function evaluateCoupon(
  code: string,
  ctx: CouponContext
): Promise<CouponResult> {
  const now = ctx.now ?? new Date()
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() })
    .session(ctx.session ?? null)
    .lean()
  if (!coupon || !coupon.isActive) return { ok: false, reason: "UNKNOWN" }
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, reason: "NOT_STARTED" }
  if (coupon.expiresAt && coupon.expiresAt <= now) return { ok: false, reason: "EXPIRED" }
  if (ctx.lines.length === 0 || ctx.subtotal === 0)
    return { ok: false, reason: "EMPTY_CART" }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    return { ok: false, reason: "EXHAUSTED" }

  if (ctx.userId) {
    const uid = new Types.ObjectId(ctx.userId)
    const live = { $ne: "cancelled" as const }
    if (coupon.firstOrderOnly) {
      const any = await Order.exists({ user: uid, status: live }).session(
        ctx.session ?? null
      )
      if (any) return { ok: false, reason: "FIRST_ORDER_ONLY" }
    }
    const used = await Order.countDocuments({
      user: uid,
      "coupon.code": coupon.code,
      status: live,
    }).session(ctx.session ?? null)
    if (used >= coupon.perUserLimit) return { ok: false, reason: "ALREADY_USED" }
  }

  if (ctx.subtotal < coupon.minOrder)
    return {
      ok: false,
      reason: "MIN_ORDER",
      details: { minOrder: coupon.minOrder, shortBy: coupon.minOrder - ctx.subtotal },
    }

  let eligible = ctx.subtotal
  if (coupon.categories.length) {
    const wanted = new Set(coupon.categories.map(String))
    eligible = ctx.lines
      .filter((l) => l.categoryPath.some((c) => wanted.has(String(c))))
      .reduce((s, l) => s + l.lineTotal, 0)
    if (eligible === 0) return { ok: false, reason: "NOT_APPLICABLE" }
  }
  const raw =
    coupon.type === "percent" ? Math.floor((eligible * coupon.value) / 100) : coupon.value
  const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw
  // A coupon can never take more than what it applies to.
  return {
    ok: true,
    code: coupon.code,
    description: coupon.description,
    discount: Math.min(capped, eligible),
  }
}

/** Active, in-window coupons that are not exhausted (the "Available coupons" list). */
export async function listAvailable(now = new Date()) {
  return Coupon.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }] },
    ],
  })
    .sort({ minOrder: 1, code: 1 })
    .lean()
}

/** Atomically claim one redemption (honours `usageLimit`). Run inside the order transaction. */
export async function redeem(code: string, session: ClientSession) {
  const res = await Coupon.updateOne(
    {
      code,
      isActive: true,
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
    },
    { $inc: { usedCount: 1 } },
    { session }
  )
  if (res.modifiedCount !== 1) throw couponError({ ok: false, reason: "EXHAUSTED" })
}

export async function release(code: string, session: ClientSession) {
  await Coupon.updateOne(
    { code, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
    { session }
  )
}
