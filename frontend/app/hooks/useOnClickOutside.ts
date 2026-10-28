import { useEffect, useRef } from "react"

/**
 * Calls `handler` when a pointer goes down outside the element behind `ref`.
 * `handler` is kept in a ref so an inline arrow does not re-subscribe the
 * document listener on every render.
 */
export function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void
) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const element = ref.current
      if (!element || element.contains(event.target as Node)) return
      latest.current(event)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [ref])
}
