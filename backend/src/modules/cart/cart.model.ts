import { Schema, model, Types } from "mongoose"

export const MAX_QTY_PER_LINE = 10
export const MAX_CART_LINES = 50
export const GUEST_CART_TTL_DAYS = 30

// One line per product. `priceAtAdd` is the price the shopper saw (whole rupees); comparing it
// with the product's CURRENT price is how we warn about price changes. `savedForLater` moves the
// line to the "saved" list without losing it.
const lineSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: "Product", required: true },
    qty: { type: Number, required: true, min: 1, max: MAX_QTY_PER_LINE },
    priceAtAdd: { type: Number, required: true, min: 0 },
    savedForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
)

// A cart belongs to EITHER a user OR an anonymous guest token (never both). The two partial
// unique indexes guarantee one cart per user / per token, and make "create if missing" race-safe.
const cartSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User" },
    guestToken: { type: String },
    items: { type: [lineSchema], default: [] },
    // Guest carts only: abandoned ones are deleted by Mongo's TTL monitor. Refreshed on write.
    expiresAt: { type: Date },
  },
  { timestamps: true }
)
cartSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
)
cartSchema.index(
  { guestToken: 1 },
  { unique: true, partialFilterExpression: { guestToken: { $type: "string" } } }
)
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Cart = model("Cart", cartSchema)
