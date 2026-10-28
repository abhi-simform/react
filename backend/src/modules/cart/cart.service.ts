import mongoose, { Types, type ClientSession } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { couponError, couponMessage, evaluateCoupon } from "../coupons/coupon.service.js"
import { liveDeals } from "../deals/deal.service.js"
import { priceOrder } from "../pricing/pricing.js"
import { Product } from "../products/product.model.js"
import type { CartOwner } from "./cart.identity.js"
import {
  Cart,
  GUEST_CART_TTL_DAYS,
  MAX_CART_LINES,
  MAX_QTY_PER_LINE,
} from "./cart.model.js"

const ownerFilter = (o: CartOwner) =>
  "userId" in o ? { user: new Types.ObjectId(o.userId) } : { guestToken: o.guestToken }

const guestExpiry = () => new Date(Date.now() + GUEST_CART_TTL_DAYS * 86_400_000)

/** How many of a product may be in one line: stock, capped by the per-line maximum. */
const limitFor = (stock: number) => Math.min(stock, MAX_QTY_PER_LINE)

// ---- view ----------------------------------------------------------------------------------

export type CartLineView = Awaited<ReturnType<typeof priceCart>>["view"]["items"][number]

type ItemDoc = {
  product: Types.ObjectId
  qty: number
  priceAtAdd: number
  savedForLater: boolean
  addedAt: Date
}
type CartDocLike = {
  _id: unknown
  items: ItemDoc[]
  couponCode?: string | null
  updatedAt?: Date
}

/**
 * Price a cart against the CURRENT catalog, live deals and the applied coupon. Used for the cart
 * view AND by order placement (with a transaction session), so the cart total and the order
 * total can never disagree. Flags are computed on every read:
 * - `outOfStock`  nothing available (stock 0, or product archived/removed)
 * - `qtyReduced`  you asked for more than what is left (`availableQty < qty`, but > 0)
 * - `priceChanged` current price differs from what you saw (`previousPrice` -> `unitPrice`)
 * A live deal (B4) replaces the unit price while the deal has units left for the whole line;
 * `deal` tells the client why. Money is whole rupees. Totals count only the PAYABLE quantity.
 */
export async function priceCart(
  cart: CartDocLike | null,
  ctx: { userId?: string; session?: ClientSession } = {}
) {
  const items = cart?.items ?? []
  const products = await Product.find(
    { _id: { $in: items.map((i) => i.product) } },
    {
      name: 1,
      slug: 1,
      sku: 1,
      brand: 1,
      images: 1,
      price: 1,
      mrp: 1,
      stock: 1,
      status: 1,
      categoryPath: 1,
    }
  )
    .session(ctx.session ?? null)
    .lean()
  const byId = new Map(products.map((p) => [String(p._id), p]))
  const deals = await liveDeals(
    items.map((i) => i.product),
    new Date(),
    ctx.session
  )

  const lines = items.map((i) => {
    const p = byId.get(String(i.product))
    const active = p?.status === "active"
    const availableQty = active ? (p?.stock ?? 0) : 0
    const d = deals.get(String(i.product))
    const deal = active && d && d.remaining >= i.qty ? d : null
    const unitPrice = deal?.dealPrice ?? p?.price ?? i.priceAtAdd
    return {
      productId: String(i.product),
      sku: p?.sku ?? "",
      slug: p?.slug ?? "",
      name: p?.name ?? "Unavailable product",
      brand: p?.brand ?? "",
      imageUrl: p?.images?.[0]?.url ?? null,
      qty: i.qty,
      unitPrice,
      mrp: p?.mrp ?? unitPrice,
      availableQty,
      payableQty: Math.min(i.qty, availableQty),
      outOfStock: availableQty === 0,
      qtyReduced: availableQty > 0 && availableQty < i.qty,
      priceChanged: !!p && unitPrice !== i.priceAtAdd,
      previousPrice: i.priceAtAdd,
      deal: deal ? { id: deal.id, dealPrice: deal.dealPrice, endsAt: deal.endsAt } : null,
      savedForLater: i.savedForLater,
      addedAt: i.addedAt,
      categoryPath: p?.categoryPath ?? [],
    }
  })

  const active = lines.filter((l) => !l.savedForLater)
  const subtotal = active.reduce((s, l) => s + l.unitPrice * l.payableQty, 0)
  const mrpTotal = active.reduce((s, l) => s + l.mrp * l.payableQty, 0)

  // The applied coupon is re-evaluated on every read: it can expire or stop applying at any time.
  let coupon:
    | { code: string; description: string; discount: number }
    | { code: string; error: { reason: string; message: string; [k: string]: unknown } }
    | null = null
  let discount = 0
  if (cart?.couponCode) {
    const r = await evaluateCoupon(cart.couponCode, {
      userId: ctx.userId,
      subtotal,
      lines: active.map((l) => ({
        categoryPath: l.categoryPath,
        lineTotal: l.unitPrice * l.payableQty,
      })),
      session: ctx.session,
    })
    if (r.ok) {
      discount = r.discount
      coupon = { code: r.code, description: r.description, discount }
    } else {
      coupon = {
        code: cart.couponCode,
        error: { reason: r.reason, message: couponMessage(r.reason), ...r.details },
      }
    }
  }
  const pricing = priceOrder(subtotal, discount)
  const view = {
    items: active.map(stripInternal),
    saved: lines.filter((l) => l.savedForLater).map(stripInternal),
    totals: {
      lineCount: active.length,
      unitCount: active.reduce((s, l) => s + l.payableQty, 0),
      subtotal,
      mrpTotal,
      savings: mrpTotal - subtotal,
      discount,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: pricing.total,
    },
    coupon,
    hasIssues: active.some((l) => l.outOfStock || l.qtyReduced || l.priceChanged),
    updatedAt: cart?.updatedAt ?? null,
  }
  return {
    view,
    lines: active,
    couponApplied: coupon && "discount" in coupon ? coupon.code : null,
    discount,
    subtotal,
  }
}

function stripInternal<T extends { categoryPath: unknown }>({
  categoryPath: _categoryPath,
  ...rest
}: T) {
  return rest
}

export async function getCart(owner: CartOwner) {
  const cart = await Cart.findOne(ownerFilter(owner)).lean()
  return (await priceCart(cart, { userId: "userId" in owner ? owner.userId : undefined }))
    .view
}

// ---- helpers -------------------------------------------------------------------------------

/** Create the cart if it does not exist. Race-safe: a duplicate-key loser just re-reads. */
async function ensureCart(owner: CartOwner) {
  const filter = ownerFilter(owner)
  const set = "guestToken" in owner ? { expiresAt: guestExpiry() } : {}
  try {
    return await Cart.findOneAndUpdate(
      filter,
      {
        $setOnInsert: { ...filter, items: [] },
        ...(Object.keys(set).length ? { $set: set } : {}),
      },
      { upsert: true, returnDocument: "after" }
    )
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return Cart.findOne(filter)
    throw err
  }
}

async function activeProduct(productId: string) {
  const p = await Product.findOne({ _id: productId, status: "active" }).lean()
  if (!p) throw ApiError.notFound("Product not found")
  return p
}

function stockError(name: string, availableQty: number, requested: number, inCart = 0) {
  const message =
    availableQty === 0
      ? `${name} is out of stock`
      : `Only ${availableQty} of ${name} available`
  return new ApiError(409, "INSUFFICIENT_STOCK", message, {
    availableQty,
    requested,
    inCart,
  })
}

// ---- mutations (each returns the fresh cart view) ----------------------------------------

/**
 * Add `qty` of a product. If the line exists the quantities add up (and a saved line comes back
 * into the cart). The total may not exceed min(stock, 10): `409 INSUFFICIENT_STOCK` with
 * `{ availableQty, requested, inCart }`. The increment is ONE conditional update, so two
 * parallel adds can never push a line past the limit.
 */
export async function addItem(owner: CartOwner, productId: string, qty: number) {
  const product = await activeProduct(productId)
  const limit = limitFor(product.stock)
  // The price the shopper is shown right now (a live deal beats the regular price).
  const deal = (await liveDeals([productId])).get(productId)
  const seenPrice = deal && deal.remaining >= qty ? deal.dealPrice : product.price
  const cart = await ensureCart(owner)
  if (!cart) throw ApiError.notFound("Cart not found")
  const pid = new Types.ObjectId(productId)

  for (let attempt = 0; attempt < 3; attempt++) {
    // 1) existing line, and the new total still fits
    const inc = await Cart.updateOne(
      {
        _id: cart._id,
        items: { $elemMatch: { product: pid, qty: { $lte: limit - qty } } },
      },
      {
        $inc: { "items.$.qty": qty },
        $set: { "items.$.savedForLater": false, ...touch(owner) },
      }
    )
    if (inc.modifiedCount === 1) return getCart(owner)

    // 2) no line yet -> push (guarded so a parallel add cannot create a duplicate line)
    if (qty <= limit) {
      const push = await Cart.updateOne(
        {
          _id: cart._id,
          "items.product": { $ne: pid },
          [`items.${MAX_CART_LINES - 1}`]: { $exists: false },
        },
        {
          $push: {
            items: {
              product: pid,
              qty,
              priceAtAdd: seenPrice,
              savedForLater: false,
              addedAt: new Date(),
            },
          },
          $set: touch(owner),
        }
      )
      if (push.modifiedCount === 1) return getCart(owner)
    }

    // Neither worked: explain why.
    const fresh = await Cart.findById(cart._id).lean()
    const line = fresh?.items.find((i) => String(i.product) === productId)
    if (line) throw stockError(product.name, product.stock, line.qty + qty, line.qty)
    if ((fresh?.items.length ?? 0) >= MAX_CART_LINES)
      throw ApiError.conflict(
        `A cart holds at most ${MAX_CART_LINES} different products`,
        "CART_FULL"
      )
    if (qty > limit) throw stockError(product.name, product.stock, qty)
    // else: lost a race with another add of the same product; try again
  }
  throw ApiError.conflict("Cart is busy, try again", "CART_BUSY")
}

const touch = (owner: CartOwner) =>
  "guestToken" in owner ? { expiresAt: guestExpiry() } : {}

/** Set a line's quantity and/or move it between the cart and "saved for later". */
export async function updateItem(
  owner: CartOwner,
  productId: string,
  patch: { qty?: number; savedForLater?: boolean }
) {
  const cart = await Cart.findOne(ownerFilter(owner)).lean()
  const line = cart?.items.find((i) => String(i.product) === productId)
  if (!cart || !line) throw ApiError.notFound("That product is not in your cart")

  const nextQty = patch.qty ?? line.qty
  const toCart = (patch.savedForLater ?? line.savedForLater) === false
  // Validate stock whenever the line is (or becomes) a live cart line.
  if (toCart && (patch.qty !== undefined || line.savedForLater)) {
    const product = await Product.findOne({ _id: productId, status: "active" }).lean()
    if (!product) throw stockError("This product", 0, nextQty, line.qty)
    if (nextQty > limitFor(product.stock))
      throw stockError(product.name, product.stock, nextQty, line.qty)
  }

  const set: Record<string, unknown> = { ...touch(owner) }
  if (patch.qty !== undefined) set["items.$.qty"] = patch.qty
  if (patch.savedForLater !== undefined)
    set["items.$.savedForLater"] = patch.savedForLater
  const res = await Cart.updateOne(
    { _id: cart._id, "items.product": new Types.ObjectId(productId) },
    { $set: set }
  )
  if (res.matchedCount === 0) throw ApiError.notFound("That product is not in your cart")
  return getCart(owner)
}

/** Idempotent: removing a line that is not there is fine. */
export async function removeItem(owner: CartOwner, productId: string) {
  await Cart.updateOne(ownerFilter(owner), {
    $pull: { items: { product: new Types.ObjectId(productId) } },
    $set: touch(owner),
  })
  return getCart(owner)
}

export async function clearCart(owner: CartOwner) {
  await Cart.updateOne(ownerFilter(owner), { $set: { items: [], ...touch(owner) } })
  return getCart(owner)
}

/** "I have seen the new prices": snapshot every line at today's price, clearing `priceChanged`. */
export async function acknowledgePrices(owner: CartOwner) {
  const cart = await Cart.findOne(ownerFilter(owner)).lean()
  if (cart?.items.length) {
    const products = await Product.find(
      { _id: { $in: cart.items.map((i) => i.product) } },
      { price: 1 }
    ).lean()
    await Cart.bulkWrite(
      products.map((p) => ({
        updateOne: {
          filter: { _id: cart._id },
          update: { $set: { "items.$[l].priceAtAdd": p.price } },
          arrayFilters: [{ "l.product": p._id }],
        },
      }))
    )
  }
  return getCart(owner)
}

// ---- merge on login ------------------------------------------------------------------------

export type MergeReport = {
  merged: number
  adjusted: { productId: string; name: string; requested: number; applied: number }[]
  skipped: {
    productId: string
    name: string
    reason: "UNAVAILABLE" | "OUT_OF_STOCK" | "CART_FULL"
  }[]
}

/**
 * Fold a guest cart into the user's cart after login, then delete the guest cart.
 * - same product: quantities add up, capped at min(stock, 10) (reported in `adjusted`)
 * - new product: copied (with its saved-for-later flag); unavailable/out-of-stock ones are skipped
 * - a line that is in the user's cart stays a cart line even if the guest had it saved
 * Runs in a transaction, so a crash cannot leave the lines in both carts or in neither, and
 * calling it twice (two tabs) cannot double the quantities: the second call finds no guest cart.
 */
export async function mergeGuestCart(userId: string, guestToken: string) {
  const report: MergeReport = { merged: 0, adjusted: [], skipped: [] }
  await mongoose.connection.transaction(async (session) => {
    const guest = await Cart.findOne({ guestToken }).session(session)
    if (!guest) return
    const userCart =
      (await Cart.findOne({ user: userId }).session(session)) ??
      (await Cart.create([{ user: userId, items: [] }], { session }))[0]!

    const products = await Product.find(
      { _id: { $in: guest.items.map((i) => i.product) }, status: "active" },
      { name: 1, price: 1, stock: 1 }
    )
      .session(session)
      .lean()
    const byId = new Map(products.map((p) => [String(p._id), p]))

    for (const g of guest.items) {
      const id = String(g.product)
      const p = byId.get(id)
      if (!p) {
        report.skipped.push({
          productId: id,
          name: "Unavailable product",
          reason: "UNAVAILABLE",
        })
        continue
      }
      const limit = limitFor(p.stock)
      const mine = userCart.items.find((i) => String(i.product) === id)
      if (mine) {
        const wanted = mine.qty + g.qty
        const applied = Math.min(wanted, Math.max(limit, mine.qty))
        if (applied < wanted)
          report.adjusted.push({
            productId: id,
            name: p.name,
            requested: wanted,
            applied,
          })
        mine.qty = applied
        mine.savedForLater = mine.savedForLater && g.savedForLater
        report.merged++
      } else if (limit === 0) {
        report.skipped.push({ productId: id, name: p.name, reason: "OUT_OF_STOCK" })
      } else if (userCart.items.length >= MAX_CART_LINES) {
        report.skipped.push({ productId: id, name: p.name, reason: "CART_FULL" })
      } else {
        const applied = Math.min(g.qty, limit)
        if (applied < g.qty)
          report.adjusted.push({ productId: id, name: p.name, requested: g.qty, applied })
        userCart.items.push({
          product: g.product,
          qty: applied,
          priceAtAdd: g.priceAtAdd,
          savedForLater: g.savedForLater,
          addedAt: g.addedAt,
        })
        report.merged++
      }
    }
    await userCart.save({ session })
    await Cart.deleteOne({ _id: guest._id }, { session })
  })
  return { cart: await getCart({ userId }), merge: report }
}

// ---- coupon (B4) ---------------------------------------------------------------------------

/**
 * Apply a coupon code to the signed-in user's cart. Validation is server-side:
 * `422 COUPON_INVALID` with `details.reason` (UNKNOWN, EXPIRED, MIN_ORDER, ALREADY_USED,
 * NOT_APPLICABLE, EXHAUSTED, FIRST_ORDER_ONLY, EMPTY_CART). Applying replaces any earlier coupon.
 */
export async function applyCoupon(userId: string, code: string) {
  const owner = { userId }
  const cart = await Cart.findOne(ownerFilter(owner)).lean()
  const { lines, subtotal } = await priceCart(
    cart ? { ...cart, couponCode: null } : null,
    {
      userId,
    }
  )
  const r = await evaluateCoupon(code, {
    userId,
    subtotal,
    lines: lines.map((l) => ({
      categoryPath: l.categoryPath,
      lineTotal: l.unitPrice * l.payableQty,
    })),
  })
  if (!r.ok) throw couponError(r)
  await Cart.updateOne(ownerFilter(owner), { $set: { couponCode: r.code } })
  return getCart(owner)
}

export async function removeCoupon(userId: string) {
  await Cart.updateOne(ownerFilter({ userId }), { $unset: { couponCode: 1 } })
  return getCart({ userId })
}
