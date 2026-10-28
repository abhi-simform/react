import { toast } from "sonner"

import { COMPARE_MAX, useCompareStore, type CompareItem } from "./compareStore"

/**
 * Toggle a product in the compare list and tell the user what happened. A plain function over
 * `getState()` (see `addToCart`): callers do not subscribe to the store just to call it.
 * The "full" refusal is a toast, not a silent no-op: the user asked for something and
 * nothing visibly changed, so we say why.
 */
export function toggleCompare(item: CompareItem) {
  const outcome = useCompareStore.getState().toggle(item)
  if (outcome === "full") {
    toast.error(`You can compare up to ${COMPARE_MAX} products`, {
      description: "Remove one from the compare tray first.",
    })
  } else if (outcome === "added") {
    toast.success("Added to compare", { description: item.name })
  }
  return outcome
}
