import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Price } from "@/components/common/Price"
import type { PriceVM } from "@/lib/format"

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable)

/**
 * The mobile buy bar (hidden from `md` up: the buy box is sticky there). It is `sticky bottom-0`
 * INSIDE the page grid, not `fixed`: it takes its own space at the end of the content (nothing is
 * permanently hidden behind it) and ends with the grid instead of covering the tabs/footer. While
 * a text field has focus (a review, a Q&A question, the pincode box) it hides itself, so it can
 * never sit on top of the field being typed in or the on-screen keyboard.
 */
export function StickyBuyBar({
  price,
  disabled,
  onAdd,
  onBuyNow,
}: {
  price: PriceVM
  disabled: boolean
  onAdd: () => void
  onBuyNow: () => void
}) {
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    const on = (e: FocusEvent) => setTyping(isTextField(e.target))
    const off = () => setTyping(false)
    document.addEventListener("focusin", on)
    document.addEventListener("focusout", off)
    return () => {
      document.removeEventListener("focusin", on)
      document.removeEventListener("focusout", off)
    }
  }, [])
  return (
    <div
      hidden={typing}
      data-testid="sticky-buy-bar"
      className="sticky bottom-0 z-10 col-span-full -mx-4 flex items-center gap-2 border-t bg-background p-3 md:hidden"
    >
      <Price price={price} className="flex-1" />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onAdd}
      >
        Add to cart
      </Button>
      <Button type="button" disabled={disabled} onClick={onBuyNow}>
        Buy now
      </Button>
    </div>
  )
}
