import { ShoppingCart } from "lucide-react"
import { Suspense, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { lazyNamed } from "@/lib/lazyNamed"
import { cn } from "@/lib/utils"

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
  // The sheet closes itself on Escape, but only once its chunk has loaded. A keypress during the download
  // (slow network, or Playwright) would otherwise be lost and the drawer would pop open afterwards.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useCartUi.getState().setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])
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
  // The badge "bumps" when the count CHANGES (not on first paint): a counter that only ever goes up while
  // the same count is shown, and a key that changes with it so the CSS animation restarts (13.6).
  const [seen, setSeen] = useState(count)
  const [bumps, setBumps] = useState(0)
  if (count !== seen) {
    setSeen(count)
    setBumps((b) => b + 1)
  }
  return (
    <Button
      data-cart-target
      variant="outline"
      size="sm"
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      onPointerEnter={() => void loadSheet()}
      onFocus={() => void loadSheet()}
      onClick={() => useCartUi.getState().toggleDrawer()}
    >
      <ShoppingCart aria-hidden className="size-4" />
      Cart{" "}
      <span
        key={bumps}
        data-testid="cart-badge"
        // `motion-safe:` = only when the user has NOT asked for reduced motion. Transform only (no layout).
        className={cn(
          "inline-block rounded bg-muted px-1",
          bumps > 0 && "motion-safe:animate-bump"
        )}
      >
        {count}
      </span>
    </Button>
  )
}
