import { ShoppingCart } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/lib/paths"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Skeleton (3.6): base-ui's dialog gives us the focus trap, Escape to close,
 * `aria-modal`, scroll lock and "focus returns to the trigger" for free. The
 * real cart contents arrive in Stage 8 (UI store) and Stage 9 (server cart).
 */
export function CartDrawer() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="outline" size="sm" />}
        aria-label="Open cart, 0 items"
      >
        <ShoppingCart aria-hidden className="size-4" />
        Cart{" "}
        <span data-testid="cart-badge" className="rounded bg-neutral-200 px-1">
          0
        </span>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
          <SheetDescription>Your cart is empty.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-4">
          <Link to={paths.products()} className="underline">
            Browse products
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
