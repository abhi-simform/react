import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const noopSubscribe = () => () => undefined

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
  // 14.8: the server (no IntersectionObserver) and the browser must render the SAME first HTML. `supported` uses
  // useSyncExternalStore: the server snapshot is `true` (like the browser's), so the first client render matches the
  // HTML; only then, if the browser really has no IntersectionObserver, React re-renders with `false` and the content
  // counts as visible. (Deciding from `typeof IntersectionObserver` during render was a hydration mismatch.)
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => typeof IntersectionObserver !== "undefined",
    () => true
  )
  const [observed, setObserved] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !supported) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) {
          setObserved(true)
          if (once) observer.disconnect()
        } else if (!once) setObserved(false)
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, once, supported])

  return [ref, observed || !supported] as const
}
