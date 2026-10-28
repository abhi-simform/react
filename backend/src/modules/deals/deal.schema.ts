import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")

export const listDealsSchema = {
  query: z.object({
    status: z.enum(["active", "upcoming"]).default("active"),
    category: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(60).default(24),
  }),
}

const dealBody = z.object({
  productId: objectId,
  dealPrice: z.number().int().min(0),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  stockLimit: z.number().int().min(1).max(100_000),
  isActive: z.boolean().default(true),
  badge: z.string().trim().max(30).optional(),
})
const window = (b: { startsAt?: Date; endsAt?: Date }) =>
  !b.startsAt || !b.endsAt || b.endsAt > b.startsAt

export const createDealSchema = {
  body: dealBody.refine(window, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  }),
}
export const updateDealSchema = {
  params: z.object({ id: objectId }),
  body: dealBody
    .omit({ productId: true })
    .partial()
    .refine(window, { message: "endsAt must be after startsAt", path: ["endsAt"] }),
}
export const dealIdSchema = { params: z.object({ id: objectId }) }
