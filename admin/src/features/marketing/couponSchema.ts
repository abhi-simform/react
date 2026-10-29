import { z } from "zod"
import { formatRupees } from "@/lib/money"
import { istDayEnd, istDayStart } from "./dates"

const optionalInt = (min: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || Number.isNaN(v) ? undefined : v),
    z
      .number({ error: "Enter a whole number" })
      .int("Whole numbers only")
      .min(min, `At least ${min}`)
      .optional()
  )

/**
 * The coupon form. Cross-field rules live in `superRefine` (a single object-level pass that can
 * attach each message to the field that must change): percent <= 100, a cap only for percent
 * coupons, and the END DATE NEVER BEFORE THE START DATE. The API repeats the same rules.
 */
export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "At least 3 characters")
      .max(30)
      .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only"),
    description: z.string().trim().max(200).default(""),
    type: z.enum(["percent", "flat"]),
    value: z
      .number({ error: "Enter a whole number" })
      .int("Whole numbers only")
      .min(1, "At least 1"),
    maxDiscount: optionalInt(1),
    minOrder: z
      .number({ error: "Enter a whole number" })
      .int("Whole numbers only")
      .min(0),
    firstOrderOnly: z.boolean(),
    startDay: z.string().optional(), // YYYY-MM-DD, India day
    endDay: z.string().optional(),
    usageLimit: optionalInt(1),
    perUserLimit: z
      .number({ error: "Enter a whole number" })
      .int("Whole numbers only")
      .min(1),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percent" && v.value > 100)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "A percent coupon is at most 100",
      })
    if (v.type === "flat" && v.maxDiscount !== undefined)
      ctx.addIssue({
        code: "custom",
        path: ["maxDiscount"],
        message: "A cap only applies to percent coupons",
      })
    if (v.startDay && v.endDay && v.endDay < v.startDay)
      ctx.addIssue({
        code: "custom",
        path: ["endDay"],
        message: "The end date cannot be before the start date",
      })
  })
export type CouponFormValues = z.input<typeof couponFormSchema>
export type CouponFormOutput = z.output<typeof couponFormSchema>

/** Form values -> the API body (dates become India-day instants). */
export const toCouponBody = (v: CouponFormOutput) => ({
  code: v.code,
  description: v.description,
  type: v.type,
  value: v.value,
  maxDiscount: v.type === "percent" ? v.maxDiscount : undefined,
  minOrder: v.minOrder,
  firstOrderOnly: v.firstOrderOnly,
  startsAt: v.startDay ? istDayStart(v.startDay).toISOString() : undefined,
  expiresAt: v.endDay ? istDayEnd(v.endDay).toISOString() : undefined,
  usageLimit: v.usageLimit,
  perUserLimit: v.perUserLimit,
  isActive: v.isActive,
})

/** "How it shows to the customer": the same wording the storefront's offers panel uses. */
export function describeCoupon(v: {
  type: "percent" | "flat"
  value: number
  maxDiscount?: number
  minOrder: number
  firstOrderOnly: boolean
}) {
  const head =
    v.type === "percent"
      ? `${v.value}% off${v.maxDiscount ? `, up to ${formatRupees(v.maxDiscount)}` : ""}`
      : `${formatRupees(v.value)} off`
  const rules = [
    v.minOrder > 0 ? `orders from ${formatRupees(v.minOrder)}` : "",
    v.firstOrderOnly ? "first order only" : "",
  ].filter(Boolean)
  return rules.length ? `${head} (${rules.join(", ")})` : head
}
