import { z } from "zod"

/** Coupon box (7.2). The code is normalised (trim + upper-case) before the server sees it. */
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { error: "Coupon codes have at least 4 characters" })
    .max(20, { error: "Coupon codes have at most 20 characters" })
    .regex(/^[A-Z0-9]+$/, { error: "Use letters and numbers only" }),
})
export type CouponValues = z.output<typeof couponSchema>
