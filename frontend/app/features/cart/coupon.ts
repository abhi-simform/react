import { toApiError } from "@/lib/api/errors"
import { formatRupees } from "@/lib/format"

/**
 * Coupon validation is the SERVER's job (B4): `POST /cart/coupon` answers `422 COUPON_INVALID`
 * with `details.reason`. This file only turns a reason into human copy; a raw code is never
 * shown (11.2 acceptance). Amounts in `details` are whole rupees.
 */
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

type Details = { minOrder?: number; shortBy?: number }

export function describeCouponReason(
  reason: string,
  code: string,
  details: Details = {}
): string {
  switch (reason as CouponReason) {
    case "UNKNOWN":
      return `We do not recognise "${code}". Check the spelling.`
    case "NOT_STARTED":
      return `${code} is not active yet.`
    case "EXPIRED":
      return `${code} has expired.`
    case "MIN_ORDER":
      return details.minOrder !== undefined
        ? `${code} needs a cart of at least ${formatRupees(details.minOrder)}.${
            details.shortBy
              ? ` Add ${formatRupees(details.shortBy)} more to use it.`
              : ""
          }`
        : `${code} needs a bigger cart.`
    case "ALREADY_USED":
      return `You have already used ${code}.`
    case "NOT_APPLICABLE":
      return `${code} does not apply to the items in your cart.`
    case "EXHAUSTED":
      return `${code} has been fully redeemed.`
    case "FIRST_ORDER_ONLY":
      return `${code} is only for your first order.`
    case "EMPTY_CART":
      return "Add something to your cart first."
    default:
      // A reason this build does not know yet: still a sentence, never the raw code.
      return `${code} cannot be used on this cart.`
  }
}

/** Any error from applying a coupon -> one sentence for the box. */
export function describeCouponError(err: unknown, code: string): string {
  const e = toApiError(err)
  if (
    e.code === "COUPON_INVALID" &&
    typeof e.details === "object" &&
    e.details
  ) {
    const d = e.details as { reason?: string } & Details
    return describeCouponReason(d.reason ?? "", code, d)
  }
  if (e.status === 401) return "Sign in to use a coupon."
  if (e.isNetwork || e.isTimeout) return e.message
  return "We could not apply that coupon. Try again."
}
