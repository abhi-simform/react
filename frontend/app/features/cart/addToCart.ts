import { toast } from "sonner"

import { useCartStore } from "./cartStore"
import type { CartLineInput } from "./types"

/**
 * The one way the storefront adds to the guest cart (cards, PDP). A plain function, not a
 * hook: it reads and writes the store through `getState()`, so a component that only CALLS it
 * does not subscribe to the cart and never re-renders because the cart changed.
 */
export function addToCart(input: CartLineInput, qty = 1) {
  const { add, setDrawerOpen } = useCartStore.getState()
  const result = add(input, qty)
  const viewCart = {
    label: "View cart",
    onClick: () => setDrawerOpen(true),
  }
  if (result.qty === 0) {
    toast.error(`${input.name} is out of stock`)
  } else if (result.clamped) {
    // Quantity above the stock is clamped, never silently: the user is told what they got.
    toast.warning(
      `Only ${input.stock} in stock: your cart has ${result.qty} of ${input.name}`,
      { action: viewCart }
    )
  } else {
    toast.success("Added to cart", {
      description: input.name,
      action: viewCart,
    })
  }
  return result
}
