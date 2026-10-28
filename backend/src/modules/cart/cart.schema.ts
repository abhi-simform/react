import { z } from "zod"
import { MAX_QTY_PER_LINE } from "./cart.model.js"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const qty = z.number().int().min(1).max(MAX_QTY_PER_LINE)

/** Guest cart token: client-generated random id (`crypto.randomUUID()`), 16-64 url-safe chars. */
export const cartTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid cart token")

export const addItemSchema = {
  body: z.object({ productId: objectId, qty: qty.default(1) }),
}

export const updateItemSchema = {
  params: z.object({ productId: objectId }),
  body: z
    .object({ qty: qty.optional(), savedForLater: z.boolean().optional() })
    .refine((b) => b.qty !== undefined || b.savedForLater !== undefined, {
      message: "Provide qty and/or savedForLater",
    }),
}

export const removeItemSchema = { params: z.object({ productId: objectId }) }

export const mergeSchema = { body: z.object({ guestToken: cartTokenSchema }) }
