import { useEffect, useRef, useState } from "react"

/**
 * `true` once the element has come within `rootMargin` of the viewport (IntersectionObserver).
 * `once` (default) keeps it true afterwards: a rail that has started loading must not unload when
 * scrolled away. Attach `ref` to the element; the observer is disconnected on unmount.
 * Without IntersectionObserver (very old browsers / tests) everything counts as visible.
 */
export function useInView<T extends Element>({
  rootMargin = "200px",
  once = true,
}: { rootMargin?: string; once?: boolean } = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === "undefined"
  )

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) setInView(false)
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, once])

  return [ref, inView] as const
}
