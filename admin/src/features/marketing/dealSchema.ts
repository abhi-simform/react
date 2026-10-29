import { z } from "zod"
import { fromIstLocal } from "./dates"

/** Deal form: the window is typed as India wall-clock time (`datetime-local`), stored as instants. */
export const dealFormSchema = z
  .object({
    productId: z.string().min(1, "Pick a product"),
    dealPrice: z
      .number({ error: "Enter a whole number" })
      .int("Whole rupees only")
      .min(0, "At least 0"),
    stockLimit: z
      .number({ error: "Enter a whole number" })
      .int("Whole numbers only")
      .min(1, "At least 1")
      .max(100_000),
    startsAt: z.string().min(1, "Pick a start"),
    endsAt: z.string().min(1, "Pick an end"),
    badge: z.string().trim().max(30).optional(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (
      v.startsAt &&
      v.endsAt &&
      fromIstLocal(v.endsAt) <= fromIstLocal(v.startsAt)
    )
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "The end must be after the start",
      })
  })
export type DealFormValues = z.infer<typeof dealFormSchema>

export const toDealBody = (v: DealFormValues, editing: boolean) => ({
  ...(editing ? {} : { productId: v.productId }),
  dealPrice: v.dealPrice,
  stockLimit: v.stockLimit,
  startsAt: fromIstLocal(v.startsAt).toISOString(),
  endsAt: fromIstLocal(v.endsAt).toISOString(),
  badge: v.badge || undefined,
  isActive: v.isActive,
})
