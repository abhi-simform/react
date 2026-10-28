import { Router } from "express"
import { authenticate, authorize } from "../../middleware/auth.js"
import { valid, validate } from "../../middleware/validate.js"
import { ApiError } from "../../utils/ApiError.js"
import { ok } from "../../utils/response.js"
import { cartOwner } from "../cart/cart.identity.js"
import { Cart } from "../cart/cart.model.js"
import { priceCart } from "../cart/cart.service.js"
import { Types } from "mongoose"
import { Coupon } from "./coupon.model.js"
import { couponMessage, evaluateCoupon, listAvailable } from "./coupon.service.js"
import { createCouponSchema, updateCouponSchema } from "./coupon.schema.js"

// GET /coupons/available: every coupon that is live right now, each checked against THIS cart,
// so the UI can show "Apply" or the reason it cannot be used. Bearer or x-cart-token.
export const couponRoutes = Router()
couponRoutes.get("/available", cartOwner, async (req, res) => {
  const owner = req.cartOwner!
  const userId = "userId" in owner ? owner.userId : undefined
  const cart = await Cart.findOne(
    userId
      ? { user: new Types.ObjectId(userId) }
      : { guestToken: (owner as { guestToken: string }).guestToken }
  ).lean()
  const { lines, subtotal } = await priceCart(
    cart ? { ...cart, couponCode: null } : null,
    {
      userId,
    }
  )
  const priced = lines.map((l) => ({
    categoryPath: l.categoryPath,
    lineTotal: l.unitPrice * l.payableQty,
  }))
  const out = []
  for (const c of await listAvailable()) {
    const r = await evaluateCoupon(c.code, { userId, subtotal, lines: priced })
    out.push({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      maxDiscount: c.maxDiscount ?? null,
      minOrder: c.minOrder,
      expiresAt: c.expiresAt ?? null,
      applicable: r.ok,
      discount: r.ok ? r.discount : 0,
      reason: r.ok ? null : r.reason,
      message: r.ok ? null : couponMessage(r.reason),
    })
  }
  ok(res, out)
})

export const adminCouponRoutes = Router()
adminCouponRoutes.use(authenticate, authorize("admin"))
adminCouponRoutes.get("/", async (_req, res) => {
  ok(res, await Coupon.find().sort({ createdAt: -1 }).limit(200).lean())
})
adminCouponRoutes.post("/", validate(createCouponSchema), async (req, res) => {
  const { body } = valid<typeof createCouponSchema>(req)
  try {
    ok(res, await Coupon.create(body), undefined, 201)
  } catch (err) {
    if ((err as { code?: number }).code === 11000)
      throw ApiError.conflict("That coupon code already exists", "COUPON_CODE_TAKEN")
    throw err
  }
})
adminCouponRoutes.patch("/:id", validate(updateCouponSchema), async (req, res) => {
  const { params, body } = valid<typeof updateCouponSchema>(req)
  const c = await Coupon.findByIdAndUpdate(
    params.id,
    { $set: body },
    { returnDocument: "after" }
  )
  if (!c) throw ApiError.notFound("Coupon not found")
  ok(res, c)
})
