import { createHash, randomBytes } from "node:crypto"
import mongoose, { Types, type ClientSession } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Address } from "../addresses/address.model.js"
import { Cart } from "../cart/cart.model.js"
import { priceCart } from "../cart/cart.service.js"
import { couponError, redeem, release } from "../coupons/coupon.service.js"
import { Deal } from "../deals/deal.model.js"
import { COD_MAX_TOTAL, priceOrder } from "../pricing/pricing.js"
import { addBusinessDays, checkPincode } from "../pincodes/pincode.service.js"
import { Product } from "../products/product.model.js"
import { notifyPlaced } from "./order.mail.js"
import { onOrderCancelled, onRefundDue } from "../payments/payment.service.js"
import {
  CANCELLABLE,
  ORDER_STATUSES,
  Order,
  RETURN_WINDOW_DAYS,
  TRANSITIONS,
  canTransition,
  type OrderStatus,
} from "./order.model.js"

export type PlaceOrderInput = {
  addressId: string
  paymentMethod: "cod" | "razorpay"
  deliveryMethod: "standard" | "express"
  deliverySlot?: string
  expectedTotal?: number
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function newOrderNumber(now = new Date()) {
  const day = now.toISOString().slice(0, 10).replaceAll("-", "")
  return `SS-${day}-${randomBytes(3).toString("hex").toUpperCase()}`
}

const fingerprint = (i: PlaceOrderInput) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        i.addressId,
        i.paymentMethod,
        i.deliveryMethod,
        i.deliverySlot ?? "",
      ])
    )
    .digest("hex")

// ---- place -----------------------------------------------------------------------------------

/**
 * Turn the user's cart into an order, atomically. ONE transaction does all of this or none of it:
 *   re-price the cart (catalog, live deals, coupon) -> reserve stock (conditional decrement per
 *   product, so it can never go below zero even with parallel orders) -> claim deal units ->
 *   redeem the coupon -> create the order -> empty the cart (saved-for-later lines stay).
 * Idempotent per (user, Idempotency-Key): a retry returns the first order (`replayed: true`)
 * instead of creating a second one; the same key with a different request is a 422.
 * COD orders start as `placed`; online orders as `pending_payment` (stock is reserved; B6 moves
 * them on, cancelling releases the stock).
 */
export async function placeOrder(userId: string, key: string, input: PlaceOrderInput) {
  const hash = fingerprint(input)
  const replay = async () => {
    const existing = await Order.findOne({ user: userId, idempotencyKey: key })
    if (!existing) return null
    if (existing.requestHash !== hash)
      throw new ApiError(
        422,
        "IDEMPOTENCY_KEY_REUSED",
        "That Idempotency-Key was already used for a different request"
      )
    return { order: existing, replayed: true }
  }
  const first = await replay()
  if (first) return first

  try {
    const order = await mongoose.connection.transaction(async (session) =>
      createOrder(userId, key, hash, input, session)
    )
    void notifyPlaced(userId, order)
    return { order, replayed: false }
  } catch (err) {
    // Two parallel requests with the same key: the loser either trips the unique index or finds the
    // cart already emptied by the winner. Whatever went wrong, if an order for this key exists now,
    // that is the answer (a real failure leaves no order behind and is rethrown).
    const winner = await replay()
    if (winner) return winner
    throw err
  }
}

async function createOrder(
  userId: string,
  key: string,
  hash: string,
  input: PlaceOrderInput,
  session: ClientSession
) {
  const now = new Date()
  const address = await Address.findOne({ _id: input.addressId, user: userId }).session(
    session
  )
  if (!address) throw ApiError.notFound("Address not found")
  const delivery = checkPincode(address.pincode, now)
  if (!delivery.serviceable)
    throw new ApiError(
      422,
      "PINCODE_UNSERVICEABLE",
      "We do not deliver to this pincode yet"
    )

  const cart = await Cart.findOne({ user: userId }).session(session)
  const priced = await priceCart(cart?.toObject() ?? null, { userId, session })
  const lines = priced.lines
  if (lines.length === 0) throw new ApiError(422, "CART_EMPTY", "Your cart is empty")

  // A coupon that stopped applying must not silently vanish at the last step.
  if (priced.view.coupon && "error" in priced.view.coupon)
    throw couponError({
      ok: false,
      reason: priced.view.coupon.error.reason as never,
    })

  const pricing = priceOrder(priced.subtotal, priced.discount, input.deliveryMethod)
  if (input.expectedTotal !== undefined && input.expectedTotal !== pricing.total)
    throw new ApiError(
      409,
      "PRICE_CHANGED",
      "Prices changed while you were checking out. Review your cart and try again",
      { expectedTotal: input.expectedTotal, actualTotal: pricing.total }
    )
  if (input.paymentMethod === "cod") {
    if (!delivery.codAvailable)
      throw new ApiError(
        422,
        "COD_NOT_AVAILABLE",
        "Cash on delivery is not available for this pincode"
      )
    if (pricing.total > COD_MAX_TOTAL)
      throw new ApiError(
        422,
        "COD_NOT_AVAILABLE",
        `Cash on delivery is only available for orders up to Rs ${COD_MAX_TOTAL}`
      )
  }

  // Reserve stock: one CONDITIONAL decrement per product. Collect every failure so the client can
  // show all the problem lines at once; throwing aborts the transaction and undoes the rest.
  const problems: {
    productId: string
    name: string
    requested: number
    availableQty: number
  }[] = []
  for (const l of lines) {
    const res = await Product.updateOne(
      { _id: l.productId, status: "active", stock: { $gte: l.qty } },
      { $inc: { stock: -l.qty, soldCount: l.qty } },
      { session }
    )
    if (res.modifiedCount !== 1)
      problems.push({
        productId: l.productId,
        name: l.name,
        requested: l.qty,
        availableQty: l.availableQty,
      })
  }
  if (problems.length)
    throw new ApiError(
      409,
      "INSUFFICIENT_STOCK",
      "Some items are no longer available in that quantity",
      {
        items: problems,
      }
    )

  // Claim deal units (the deal may have just sold out or ended between pricing and here).
  for (const l of lines) {
    if (!l.deal) continue
    const res = await Deal.updateOne(
      {
        _id: l.deal.id,
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gt: now },
        $expr: { $lte: [{ $add: ["$claimed", l.qty] }, "$stockLimit"] },
      },
      { $inc: { claimed: l.qty } },
      { session }
    )
    if (res.modifiedCount !== 1)
      throw new ApiError(
        409,
        "PRICE_CHANGED",
        `The deal on ${l.name} just ended. Review your cart and try again`,
        { productId: l.productId }
      )
  }
  if (priced.couponApplied) await redeem(priced.couponApplied, session)

  const [min, max] = [delivery.deliveryDays.min, delivery.deliveryDays.max]
  const estimatedFrom = addBusinessDays(now, input.deliveryMethod === "express" ? 1 : min)
  const estimatedTo = addBusinessDays(
    now,
    input.deliveryMethod === "express" ? Math.max(1, Math.min(2, max)) : max
  )
  const status: OrderStatus = input.paymentMethod === "cod" ? "placed" : "pending_payment"

  const [order] = await Order.create(
    [
      {
        orderNumber: newOrderNumber(now),
        user: userId,
        items: lines.map((l) => ({
          product: l.productId,
          sku: l.sku,
          title: l.name,
          image: l.imageUrl ?? undefined,
          unitPrice: l.unitPrice,
          mrp: l.mrp,
          qty: l.qty,
          lineTotal: l.unitPrice * l.qty,
          deal: l.deal ? new Types.ObjectId(l.deal.id) : undefined,
        })),
        addressSnapshot: {
          fullName: address.fullName,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          landmark: address.landmark,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          type: address.type,
        },
        delivery: {
          method: input.deliveryMethod,
          slot: input.deliverySlot,
          estimatedFrom,
          estimatedTo,
        },
        status,
        statusHistory: [{ status, at: now, note: "Order placed" }],
        pricing,
        coupon: priced.couponApplied
          ? { code: priced.couponApplied, discount: priced.discount }
          : undefined,
        payment: { method: input.paymentMethod, status: "pending" },
        idempotencyKey: key,
        requestHash: hash,
      },
    ],
    { session }
  )
  if (!order) throw new Error("Order was not created")

  // Empty the cart but keep "saved for later" lines.
  if (cart)
    await Cart.updateOne(
      { _id: cart._id },
      { $pull: { items: { savedForLater: false } }, $unset: { couponCode: 1 } },
      { session }
    )
  return order
}

// ---- read ------------------------------------------------------------------------------------

export async function listOrders(
  userId: string | null,
  q: { page: number; limit: number; status?: OrderStatus; search?: string }
) {
  const filter: Record<string, unknown> = {}
  if (userId) filter.user = new Types.ObjectId(userId)
  if (q.status) filter.status = q.status
  if (q.search) filter.orderNumber = new RegExp(escapeRegex(q.search), "i")
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  return { items, total }
}

/** Someone else's order looks exactly like a missing one. */
export async function getOwnedOrder(userId: string, id: string) {
  const order = await Order.findOne({ _id: id, user: userId })
  if (!order) throw ApiError.notFound("Order not found")
  return order
}

// ---- change ----------------------------------------------------------------------------------

const invalidTransition = (from: string, action: string) =>
  new ApiError(
    409,
    "INVALID_TRANSITION",
    `An order that is ${from.replaceAll("_", " ")} cannot be ${action}`,
    {
      status: from,
    }
  )

async function restock(
  order: {
    items: { product: Types.ObjectId; qty: number; deal?: Types.ObjectId | null }[]
  },
  session: ClientSession,
  deals: boolean
) {
  for (const i of order.items) {
    await Product.updateOne(
      { _id: i.product },
      { $inc: { stock: i.qty, soldCount: -i.qty } },
      { session }
    )
    if (deals && i.deal)
      await Deal.updateOne(
        { _id: i.deal, claimed: { $gte: i.qty } },
        { $inc: { claimed: -i.qty } },
        { session }
      )
  }
}

/** Customer cancel: only before packing. Releases stock, the deal claim and the coupon use. */
export async function cancelOrder(userId: string, id: string, reason?: string) {
  return mongoose.connection
    .transaction(async (session) => {
      const current = await Order.findOne({ _id: id, user: userId }).session(session)
      if (!current) throw ApiError.notFound("Order not found")
      if (!CANCELLABLE.includes(current.status))
        throw invalidTransition(current.status, "cancelled")
      const wasPaid = current.payment?.status === "paid"
      // The status guard makes a double-click (or two tabs) cancel exactly once.
      const order = await Order.findOneAndUpdate(
        { _id: id, user: userId, status: { $in: CANCELLABLE } },
        {
          $set: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancelReason: reason,
            ...(wasPaid ? { "payment.status": "refund_pending" } : {}),
          },
          $push: {
            statusHistory: {
              status: "cancelled",
              at: new Date(),
              note: reason ?? "Cancelled by customer",
            },
          },
        },
        { session, returnDocument: "after" }
      )
      if (!order) throw invalidTransition(current.status, "cancelled")
      await restock(order, session, true)
      if (order.coupon?.code) await release(order.coupon.code, session)
      return order
    })
    .then(async (order) => {
      await onOrderCancelled(order) // B6: refund a captured payment / close the unpaid one
      return (await Order.findById(order._id)) ?? order
    })
}

/** Return request: delivered orders only, within RETURN_WINDOW_DAYS of delivery. */
export async function requestReturn(
  userId: string,
  id: string,
  input: { reason: string; note?: string }
) {
  const current = await getOwnedOrder(userId, id)
  if (current.status !== "delivered") throw invalidTransition(current.status, "returned")
  const deliveredAt = current.deliveredAt ?? current.updatedAt
  if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_DAYS * 86_400_000)
    throw new ApiError(
      409,
      "RETURN_WINDOW_CLOSED",
      `Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery`
    )
  const order = await Order.findOneAndUpdate(
    { _id: id, user: userId, status: "delivered" },
    {
      $set: {
        status: "return_requested",
        returnRequest: { ...input, requestedAt: new Date(), status: "requested" },
      },
      $push: {
        statusHistory: { status: "return_requested", at: new Date(), note: input.reason },
      },
    },
    { returnDocument: "after" }
  )
  if (!order) throw invalidTransition(current.status, "returned")
  return order
}

/**
 * Staff status change (admin; sellers/webhooks join in B9/B11). Every move must be allowed by
 * TRANSITIONS and is applied with a status guard, so two staff members cannot both "ship" it.
 */
export async function transitionOrder(
  actorId: string,
  id: string,
  to: OrderStatus,
  note?: string
) {
  return mongoose.connection
    .transaction(async (session) => {
      const current = await Order.findById(id).session(session)
      if (!current) throw ApiError.notFound("Order not found")
      if (!canTransition(current.status, to))
        throw new ApiError(
          409,
          "INVALID_TRANSITION",
          `Cannot move an order from ${current.status} to ${to}`,
          { status: current.status, allowed: TRANSITIONS[current.status] }
        )
      const now = new Date()
      const set: Record<string, unknown> = { status: to }
      if (to === "delivered") {
        set.deliveredAt = now
        if (current.payment?.method === "cod") set["payment.status"] = "paid"
        if (current.status === "return_requested") {
          set["returnRequest.status"] = "rejected"
          set["returnRequest.resolvedAt"] = now
        }
      }
      if (to === "returned") {
        set["returnRequest.status"] = "approved"
        set["returnRequest.resolvedAt"] = now
      }
      if (to === "refunded") {
        set["returnRequest.status"] = "refunded"
        // Online payments: the gateway refund (below) flips this to "refunded" when it settles.
        set["payment.status"] =
          current.payment?.method === "razorpay" ? "refund_pending" : "refunded"
      }
      if (to === "cancelled") {
        set.cancelledAt = now
        set.cancelReason = note
      }
      const order = await Order.findOneAndUpdate(
        { _id: id, status: current.status },
        {
          $set: set,
          $push: {
            statusHistory: { status: to, at: now, note, by: new Types.ObjectId(actorId) },
          },
        },
        { session, returnDocument: "after" }
      )
      if (!order)
        throw ApiError.conflict(
          "The order changed while you were editing it",
          "ORDER_CHANGED"
        )
      if (to === "cancelled") {
        await restock(order, session, true)
        if (order.coupon?.code) await release(order.coupon.code, session)
      }
      if (to === "returned") await restock(order, session, false)
      return order
    })
    .then(async (order) => {
      if (to === "cancelled") await onOrderCancelled(order)
      if (to === "refunded") await onRefundDue(order)
      return (await Order.findById(order._id)) ?? order
    })
}

export const ALL_STATUSES = ORDER_STATUSES
