import { undoableToast } from "@/features/toast"

import { useCartStore } from "./cartStore"

/**
 * Remove a line immediately and offer Undo (8.5): no confirm dialog for a reversible action.
 * The snapshot is captured BEFORE the change and closed over by THIS toast only, so removing
 * two lines quickly yields two independent toasts, each restoring its own line at its own
 * original place (`restoreLine` positions relative to what is still there, in any undo order).
 */
export function removeCartLine(sku: string) {
  const { remove, restore } = useCartStore.getState()
  const removed = remove(sku)
  if (!removed) return
  undoableToast(`Removed ${removed.line.name} from your cart`, () =>
    restore(removed)
  )
}

/** Empty the cart; Undo puts the previous lines back (lines added since are kept after them). */
export function clearCart() {
  const previous = useCartStore.getState().clear()
  if (previous.length === 0) return
  undoableToast(`Removed ${previous.length} items from your cart`, () => {
    const { lines, replaceAll } = useCartStore.getState()
    const added = lines.filter((l) => !previous.some((p) => p.sku === l.sku))
    replaceAll([...previous, ...added])
  })
}
