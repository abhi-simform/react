import { useEffect, useEffectEvent, useRef } from "react"

/**
 * An invisible 1px element after the list. When it scrolls into view (400px early) we ask
 * for the next page. Details that bite:
 * - The observer is created in an effect and DISCONNECTED in the cleanup (no leak per render).
 * - The callback goes through an Effect Event, so a new function each render does not recreate the observer.
 * - `itemCount` is a dependency on purpose: after a page is appended the sentinel is often
 *   STILL visible, and an observer only reports CHANGES. A fresh observer reports the current
 *   state once, so the next page loads (without it the list would stall until you scroll back and forth).
 * - It is not focusable and has no tab stop: it cannot trap keyboard focus.
 */
export function LoadMoreSentinel({
  enabled,
  itemCount,
  onVisible,
}: {
  enabled: boolean
  itemCount: number
  onVisible: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const notify = useEffectEvent(onVisible)

  useEffect(() => {
    const node = ref.current
    if (!enabled || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) notify()
      },
      { rootMargin: "400px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, itemCount])

  return <div ref={ref} aria-hidden className="h-px" />
}
