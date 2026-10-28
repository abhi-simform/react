import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { productQueries } from "../queries"

const HOVER_DELAY_MS = 100

/**
 * Hover/focus prefetch for a product link (9.7). Handlers for the card:
 * - `onPointerEnter` only counts for a MOUSE (`pointerType === "mouse"`): a finger that scrolls
 *   past a card on a phone fires pointer events too, and prefetching every card the thumb
 *   crosses would waste the user's data;
 * - `onFocus` covers keyboard users (tabbing to the link is the same intent as hovering);
 * - a 100 ms delay (cancelled on leave/blur) skips cards the pointer merely crosses.
 * `prefetchQuery` does nothing when the data is already fresh, and the request it starts is the
 * SAME one the PDP will ask for (same `queryOptions`), so clicking joins it instead of starting
 * another.
 */
export function useProductPrefetch(slug: string) {
  const queryClient = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const cancel = () => clearTimeout(timer.current)
  const schedule = () => {
    cancel()
    timer.current = setTimeout(
      () => void queryClient.prefetchQuery(productQueries.detail(slug)),
      HOVER_DELAY_MS
    )
  }
  useEffect(() => cancel, [])

  return {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") schedule()
    },
    onPointerLeave: cancel,
    onFocus: schedule,
    onBlur: cancel,
  }
}
