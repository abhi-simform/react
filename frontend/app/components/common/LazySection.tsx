import { useInView } from "@/hooks/useInView"
import { cn } from "@/lib/utils"

/**
 * Mounts `children` only once the placeholder has come within `rootMargin` of the viewport. For
 * below-the-fold sections that own a query: until then there is no component, so no request and
 * no JS work (the Slow-4G acceptance check of 11.10). The placeholder has the section's expected
 * height so the page does not jump; `once` semantics (it stays mounted afterwards).
 */
export function LazySection({
  children,
  minHeightClass = "min-h-72",
  rootMargin = "300px",
}: {
  children: React.ReactNode
  minHeightClass?: string
  rootMargin?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin })
  return (
    <div ref={ref} className={cn(!inView && minHeightClass)}>
      {inView ? children : null}
    </div>
  )
}
