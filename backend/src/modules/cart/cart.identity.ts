import type { RequestHandler } from "express"
import { authenticate } from "../../middleware/auth.js"
import { ApiError } from "../../utils/ApiError.js"
import { cartTokenSchema } from "./cart.schema.js"

export type CartOwner = { userId: string } | { guestToken: string }

/**
 * Who owns this cart? A valid Bearer token means the user's cart. A request carrying an
 * `Authorization` header that is invalid/expired is rejected with 401 (NOT silently treated as a
 * guest, or an expired session would quietly start a second cart). With no Authorization header
 * the `x-cart-token` header identifies the guest cart.
 */
export const cartOwner: RequestHandler = (req, res, next) => {
  if (req.headers.authorization) {
    return authenticate(req, res, (err?: unknown) => {
      if (err) return next(err)
      req.cartOwner = { userId: req.user!.id }
      next()
    })
  }
  const parsed = cartTokenSchema.safeParse(req.headers["x-cart-token"])
  if (!parsed.success)
    return next(
      new ApiError(
        400,
        "CART_TOKEN_REQUIRED",
        "Send a Bearer token or an x-cart-token header (16-64 url-safe characters)"
      )
    )
  req.cartOwner = { guestToken: parsed.data }
  next()
}
