import { z } from "@/lib/zod"

import { pincodeField } from "@/lib/fields"

/**
 * ONE master schema for the whole checkout; each step validates a `pick` of it (7.7).
 * `pincode` is not typed by the user: it is copied from the chosen address (so the delivery
 * and payment steps can ask "does this pincode allow COD / which ETA?").
 */
export const checkoutSchema = z.object({
  addressId: z.string().min(1, { error: "Choose a delivery address" }),
  pincode: pincodeField,
  method: z.enum(["standard", "express"], {
    error: "Choose a delivery option",
  }),
  slot: z.string().min(1, { error: "Choose a delivery slot" }),
  payment: z.enum(["razorpay", "cod"], { error: "Choose a payment method" }),
})
export type CheckoutInput = z.input<typeof checkoutSchema>
export type CheckoutValues = z.output<typeof checkoutSchema>

export const STEP_SCHEMAS = {
  address: checkoutSchema.pick({ addressId: true, pincode: true }),
  delivery: checkoutSchema.pick({ method: true, slot: true }),
  payment: checkoutSchema.pick({ payment: true }),
  review: checkoutSchema, // everything must be valid to review
} as const

export type StepSlug = keyof typeof STEP_SCHEMAS

/** The form fields each step owns: what `trigger()` validates before "Continue". */
export const STEP_FIELDS = {
  address: ["addressId", "pincode"],
  delivery: ["method", "slot"],
  payment: ["payment"],
  review: [],
} as const satisfies Record<StepSlug, readonly (keyof CheckoutInput)[]>
