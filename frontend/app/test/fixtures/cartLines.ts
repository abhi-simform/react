import type { CartLine } from "@/features/cart"

/** Fixture cart (the cart API is B3, Stage 9): integer paise. Used by the coupon box and the checkout summary. */
export const cartLinesFixture: CartLine[] = [
  { sku: "FIX-TEE-M", qty: 2, unitPrice: 59_900, mrp: 79_900 },
  { sku: "FIX-CAP", qty: 1, unitPrice: 29_900 },
]
