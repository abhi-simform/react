import { ShoppingCart } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatCurrency } from "@/lib/format"
import { usePersistHydrated } from "@/lib/persistSync"
import { paths } from "@/lib/paths"

import {
  selectLines,
  useCartLineCount,
  useCartStore,
  useCartTotals,
} from "../cartStore"
import { CartLineRow } from "./CartLineRow"
import { FreeShippingBar } from "./FreeShippingBar"

/**
 * Three components with ONE subscription each (8.3), so a change re-renders only what shows it:
 * - `CartButton` reads the line COUNT (a number): it does not re-render when the drawer opens.
 * - `CartSheet` reads `drawerOpen`: it does not re-render when quantities change while closed.
 * - `CartDrawer` itself subscribes to nothing, so it never re-renders after mount.
 * The button calls `toggleDrawer` through `getState()` (an event handler needs no subscription).
 */
export function CartDrawer() {
  return (
    <>
      <CartButton />
      <CartSheet />
    </>
  )
}

function CartButton() {
  const count = useCartLineCount()
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}`}
      onClick={() => useCartStore.getState().toggleDrawer()}
    >
      <ShoppingCart aria-hidden className="size-4" />
      Cart{" "}
      <span data-testid="cart-badge" className="rounded bg-neutral-200 px-1">
        {count}
      </span>
    </Button>
  )
}

function CartSheet() {
  const open = useCartStore((s) => s.drawerOpen)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => useCartStore.getState().setDrawerOpen(next)}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Review what you are about to buy.</SheetDescription>
        </SheetHeader>
        <DrawerBody />
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody() {
  const hydrated = usePersistHydrated(useCartStore.persist)
  const lines = useCartStore(selectLines)
  const totals = useCartTotals()
  const close = () => useCartStore.getState().setDrawerOpen(false)

  if (!hydrated) return <p className="p-4">Loading your cart...</p>
  if (lines.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <p>Your cart is empty.</p>
        <Link to={paths.products()} onClick={close} className="underline">
          Browse products
        </Link>
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <FreeShippingBar subtotal={totals.subtotal} />
      <ul>
        {lines.map((line) => (
          <CartLineRow key={line.sku} line={line} />
        ))}
      </ul>
      <p className="flex justify-between font-medium">
        <span>Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </p>
      <div className="flex gap-2">
        <Button
          nativeButton={false}
          render={<Link to={paths.cart()} onClick={close} />}
        >
          View cart
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to={paths.checkout()} onClick={close} />}
        >
          Checkout
        </Button>
      </div>
    </div>
  )
}
