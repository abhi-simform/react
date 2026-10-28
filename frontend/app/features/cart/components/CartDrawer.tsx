import { ShoppingCart } from "lucide-react"
import { Suspense, useState } from "react"

import { Button } from "@/components/ui/button"
import { lazyNamed } from "@/lib/lazyNamed"

import { useCartUi } from "../cartUiStore"
import { useCartCount } from "../useCart"

// 13.3: the drawer's contents (line rows, coupon form, react-hook-form, sheet animation) are not
// needed until someone opens the cart. `loadSheet` is also used to PREFETCH on hover/focus, so by
// the time of the click the chunk is usually already there.
const loadSheet = () => import("./CartSheet")
const CartSheet = lazyNamed(loadSheet, "CartSheet")

/**
 * Three components with ONE subscription each (8.3), so a change re-renders only what shows it:
 * - `CartButton` reads the line COUNT (a number, via a `select`): it does not re-render when the drawer opens.
 * - `CartSheet` reads `drawerOpen`: it does not re-render when quantities change while closed.
 * - `CartDrawer` subscribes to the open flag only to LOAD the sheet once (never unmounts it again).
 * The button calls `toggleDrawer` through `getState()` (an event handler needs no subscription).
 */
export function CartDrawer() {
  const open = useCartUi((s) => s.drawerOpen)
  const [wanted, setWanted] = useState(false)
  // Adjusting state while rendering, guarded: "has it ever been opened?" is derived from props/state.
  if (open && !wanted) setWanted(true)
  return (
    <>
      <CartButton />
      {wanted && (
        // No visual fallback: the sheet is an overlay, so nothing in the page shifts while it loads.
        <Suspense fallback={null}>
          <CartSheet />
        </Suspense>
      )}
    </>
  )
}

function CartButton() {
  const count = useCartCount()
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      onPointerEnter={() => void loadSheet()}
      onFocus={() => void loadSheet()}
      onClick={() => useCartUi.getState().toggleDrawer()}
    >
      <ShoppingCart aria-hidden className="size-4" />
      Cart{" "}
      <span data-testid="cart-badge" className="rounded bg-neutral-200 px-1">
        {count}
      </span>
    </Button>
  )
}
