import { z } from "zod"

import { imageFilesSchema } from "@/lib/imageFiles"

import { RETURN_REASONS } from "./schemas"

/** One row per order line. `bought` is display-only; the refinement caps `qty` by it. */
const lineSchema = z.object({
  productId: z.string(),
  title: z.string(),
  bought: z.number().int(),
  selected: z.boolean(),
  qty: z.coerce
    .number({ error: "Enter a quantity" })
    .int({ error: "Whole numbers only" }),
})

export const returnFormSchema = z
  .object({
    reason: z.enum(
      Object.keys(RETURN_REASONS) as [
        keyof typeof RETURN_REASONS,
        ...(keyof typeof RETURN_REASONS)[],
      ],
      { error: "Choose a reason" }
    ),
    note: z.string().trim().max(500, { error: "At most 500 characters" }),
    items: z.array(lineSchema),
    pickupAddressId: z.string(),
    photos: imageFilesSchema.max(4, { error: "Add at most 4 photos" }),
  })
  .superRefine((v, ctx) => {
    if (!v.items.some((i) => i.selected))
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Select at least one item to return",
      })
    v.items.forEach((i, n) => {
      if (!i.selected) return
      if (i.qty < 1)
        ctx.addIssue({
          code: "custom",
          path: ["items", n, "qty"],
          message: "At least 1",
        })
      else if (i.qty > i.bought)
        ctx.addIssue({
          code: "custom",
          path: ["items", n, "qty"],
          message: `You bought ${i.bought}: cannot return ${i.qty}`,
        })
    })
  })
export type ReturnFormInput = z.input<typeof returnFormSchema>
export type ReturnFormOutput = z.output<typeof returnFormSchema>
