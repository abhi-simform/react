import {
  Schema,
  model,
  Types,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose"

export const ORDER_STATUSES = [
  "pending_payment",
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "returned",
  "refunded",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * The state machine. Anything not listed here is rejected with 409 INVALID_TRANSITION.
 * "placed" doubles as "confirmed": COD orders start there, online orders get there when the
 * payment is captured (B6).
 */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["placed", "cancelled"],
  placed: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"], // delivered = the return was rejected
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
}
export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  TRANSITIONS[from].includes(to)
/** Customers may cancel only before the parcel is packed. */
export const CANCELLABLE: readonly OrderStatus[] = ["pending_payment", "placed"]
export const RETURN_WINDOW_DAYS = 7

export const RETURN_STATUSES = ["requested", "approved", "rejected", "refunded"] as const
export type ReturnStatus = (typeof RETURN_STATUSES)[number]

const itemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    image: String,
    unitPrice: { type: Number, required: true, min: 0 }, // price paid per unit (deal price if a deal applied)
    mrp: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    deal: { type: Types.ObjectId, ref: "Deal" }, // set when sold at a deal price (claim is released on cancel)
  },
  { _id: false }
)

// A sub-schema (not a nested object) because it has a field NAMED `type`, which Mongoose would
// otherwise read as "the type of addressSnapshot".
const addressSnapshotSchema = new Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: String,
    pincode: String,
    type: String,
  },
  { _id: false }
)

const pricingSchema = new Schema(
  {
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true },
    shipping: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
)

const historySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: () => new Date() },
    note: String,
    by: { type: Types.ObjectId, ref: "User" },
  },
  { _id: false }
)

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Types.ObjectId, ref: "User", required: true },
    items: { type: [itemSchema], required: true },
    // Copied, not referenced: editing or deleting the address later must not rewrite history.
    addressSnapshot: addressSnapshotSchema,
    delivery: {
      method: { type: String, enum: ["standard", "express"], default: "standard" },
      slot: String, // "YYYY-MM-DD|9-12" as chosen in checkout
      estimatedFrom: Date,
      estimatedTo: Date,
    },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    statusHistory: { type: [historySchema], default: [] },
    pricing: { type: pricingSchema, required: true },
    coupon: { code: String, discount: Number },
    payment: {
      method: { type: String, enum: ["cod", "razorpay"], required: true },
      // cod: pending -> paid (on delivery). razorpay (B6): pending -> paid | failed; refunded.
      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "refund_pending",
          "partially_refunded",
          "refunded",
        ],
        default: "pending",
      },
    },
    idempotencyKey: { type: String },
    requestHash: String, // same key + different request = client bug (422)
    cancelReason: String,
    cancelledAt: Date,
    deliveredAt: Date,
    returnRequest: {
      reason: String,
      note: String,
      requestedAt: Date,
      status: { type: String, enum: RETURN_STATUSES },
      resolvedAt: Date,
      refundAmount: Number, // whole rupees due back for the returned items
      items: {
        type: [
          new Schema(
            { product: Types.ObjectId, title: String, qty: Number, unitPrice: Number },
            { _id: false }
          ),
        ],
        default: undefined,
      },
      photos: { type: [String], default: undefined },
      pickupAddress: addressSnapshotSchema,
      history: {
        type: [new Schema({ status: String, at: Date, note: String }, { _id: false })],
        default: undefined,
      },
    },
  },
  { timestamps: true }
)
// A retry with the same key finds the first order instead of creating a second one.
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
)
orderSchema.index({ user: 1, createdAt: -1, _id: -1 })
orderSchema.index({ user: 1, status: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

export type OrderDoc = HydratedDocument<InferSchemaType<typeof orderSchema>>
export const Order = model("Order", orderSchema)

/** Client shape. Money is whole rupees; ids are strings. */
export function toPublicOrder(
  o:
    | OrderDoc
    | (InferSchemaType<typeof orderSchema> & {
        _id: unknown
        createdAt: Date
        updatedAt: Date
      })
) {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    userId: String(o.user),
    items: o.items.map((i) => ({
      productId: String(i.product),
      sku: i.sku,
      title: i.title,
      image: i.image ?? null,
      unitPrice: i.unitPrice,
      mrp: i.mrp,
      qty: i.qty,
      lineTotal: i.lineTotal,
      deal: Boolean(i.deal),
    })),
    addressSnapshot: o.addressSnapshot,
    delivery: o.delivery,
    status: o.status,
    statusHistory: o.statusHistory.map((h) => ({
      status: h.status,
      at: h.at,
      note: h.note ?? null,
    })),
    pricing: o.pricing,
    coupon: o.coupon?.code
      ? { code: o.coupon.code, discount: o.coupon.discount ?? 0 }
      : null,
    paymentMethod: o.payment?.method,
    paymentStatus: o.payment?.status,
    cancelReason: o.cancelReason ?? null,
    deliveredAt: o.deliveredAt ?? null,
    returnableUntil:
      o.status === "delivered" && o.deliveredAt
        ? new Date(o.deliveredAt.getTime() + RETURN_WINDOW_DAYS * 86_400_000)
        : null,
    returnRequest: o.returnRequest?.status
      ? {
          status: o.returnRequest.status,
          reason: o.returnRequest.reason,
          note: o.returnRequest.note ?? null,
          requestedAt: o.returnRequest.requestedAt,
          resolvedAt: o.returnRequest.resolvedAt ?? null,
          refundAmount: o.returnRequest.refundAmount ?? null,
          items: (o.returnRequest.items ?? []).map((i) => ({
            productId: String(i.product),
            title: i.title,
            qty: i.qty,
            unitPrice: i.unitPrice,
          })),
          photos: o.returnRequest.photos ?? [],
          pickupAddress: o.returnRequest.pickupAddress ?? null,
          history: (o.returnRequest.history ?? []).map((h) => ({
            status: h.status,
            at: h.at,
            note: h.note ?? null,
          })),
        }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}
