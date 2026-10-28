import { createContext, useContext } from "react"

import type { CartTotals } from "@/features/cart"

/** What checkout needs to know about the cart: the server's numbers (paise) and the lines. */
export type CheckoutCart = {
  totals: CartTotals
  lines: {
    productId: string
    name: string
    qty: number
    /** paise */
    unitPrice: number
  }[]
}

const CheckoutCartContext = createContext<CheckoutCart | null>(null)
export const CheckoutCartProvider = CheckoutCartContext.Provider

export function useCheckoutCart(): CheckoutCart {
  const cart = useContext(CheckoutCartContext)
  if (!cart)
    throw new Error("useCheckoutCart must be used inside CheckoutShell")
  return cart
}
