import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3)
  .max(30)
  .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only")

export const applyCouponSchema = { body: z.object({ code: couponCodeSchema }) }

const couponBody = z.object({
  code: couponCodeSchema,
  description: z.string().trim().max(200).default(""),
  type: z.enum(["percent", "flat"]),
  value: z.number().int().min(1),
  maxDiscount: z.number().int().min(1).optional(),
  minOrder: z.number().int().min(0).default(0),
  firstOrderOnly: z.boolean().default(false),
  categories: z.array(objectId).max(20).default([]),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
})
const sane = (b: { type?: string; value?: number }) =>
  !(b.type === "percent" && b.value !== undefined && b.value > 100)
export const createCouponSchema = {
  body: couponBody.refine(sane, {
    message: "A percent coupon is at most 100",
    path: ["value"],
  }),
}
export const updateCouponSchema = {
  params: z.object({ id: objectId }),
  body: couponBody
    .partial()
    .refine(sane, { message: "A percent coupon is at most 100", path: ["value"] }),
}
