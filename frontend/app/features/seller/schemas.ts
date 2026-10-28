import { z } from "zod"

import { imageFilesSchema } from "@/lib/imageFiles"

/**
 * A number typed into a text input. The INPUT is a string ("499"), the OUTPUT a number.
 * `min(1)` first so "" says "Required" instead of coercing to 0.
 */
const numberField = z
  .string()
  .trim()
  .min(1, { error: "Required" })
  .pipe(z.coerce.number({ error: "Enter a number" }))

const price = numberField.pipe(
  z.number().positive({ error: "Must be greater than 0" })
)

export const variantSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(3, { error: "At least 3 characters" })
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, { error: "Letters, numbers and dashes only" }),
    color: z.string().trim().min(1, { error: "Required" }),
    size: z.string().trim(),
    price,
    mrp: price,
    stock: numberField.pipe(
      z
        .number()
        .int({ error: "Whole units only" })
        .min(0, { error: "Cannot be negative" })
    ),
  })
  // Cross-field rule on ONE row: the error is attached to that row's `mrp` input.
  .refine((v) => v.mrp >= v.price, {
    path: ["mrp"],
    error: "MRP must be at least the price",
  })

export const specSchema = z.object({
  name: z.string().trim().min(1, { error: "Required" }).max(60),
  value: z.string().trim().min(1, { error: "Required" }).max(200),
})

export const productFormSchema = z.object({
  title: z.string().trim().min(3, { error: "At least 3 characters" }).max(120),
  brand: z.string().trim().min(1, { error: "Enter the brand" }).max(60),
  category: z.string().min(1, { error: "Choose a category" }),
  description: z
    .string()
    .trim()
    .min(20, { error: "Describe the product in at least 20 characters" })
    .max(2000),
  images: imageFilesSchema.min(1, { error: "Add at least one image" }),
  variants: z
    .array(variantSchema)
    .min(1, { error: "Add at least one variant" })
    // Array-level check across rows. Zod 4 still runs it while single rows have rule errors
    // (price <= 0...), so a duplicate SKU is reported together with them (see scratch/18).
    .check(
      z.superRefine((rows, ctx) => {
        const firstSeen = new Map<string, number>()
        rows.forEach((row, i) => {
          const key = row.sku.trim().toLowerCase()
          const earlier = firstSeen.get(key)
          if (earlier === undefined) return void firstSeen.set(key, i)
          // path = [rowIndex, "sku"]: the message lands on the DUPLICATE row's SKU field.
          ctx.addIssue({
            code: "custom",
            path: [i, "sku"],
            message: `Duplicate SKU (same as row ${earlier + 1})`,
          })
        })
      })
    ),
  specs: z.array(specSchema),
})

export type ProductFormInput = z.input<typeof productFormSchema>
export type ProductFormOutput = z.output<typeof productFormSchema>
