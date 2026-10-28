import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Skeleton families (6.5). Rules: the SAME outer box as the real content (so nothing
 * jumps when data arrives), `aria-busy` on the region with a screen-reader label, the
 * grey boxes themselves hidden from assistive tech. `animate-pulse` is switched off for
 * `prefers-reduced-motion` users (motion-reduce).
 */
function Region({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  )
}

const bar = "motion-reduce:animate-none"

/** Same columns as `ProductGrid` and same card anatomy as `ProductCard`. */
export function ProductGridSkeleton({
  count = 12,
  view = "grid",
}: {
  count?: number
  view?: "grid" | "list"
}) {
  return (
    <Region
      label="Loading products"
      className={cn(
        "grid gap-3",
        view === "grid"
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : "grid-cols-1"
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border p-2">
          <Skeleton className={cn("aspect-square", bar)} />
          <Skeleton className={cn("h-3 w-1/3", bar)} />
          <Skeleton className={cn("h-5 w-full", bar)} />
          <Skeleton className={cn("h-4 w-1/2", bar)} />
          <Skeleton className={cn("h-5 w-2/3", bar)} />
          <Skeleton className={cn("h-7", bar)} />
        </div>
      ))}
    </Region>
  )
}

/** Rows of a list (addresses, orders). */
export function ListSkeleton({
  rows = 3,
  label = "Loading list",
}: {
  rows?: number
  label?: string
}) {
  return (
    <Region label={label} className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
          <Skeleton className={cn("h-4 w-1/3", bar)} />
          <Skeleton className={cn("h-4 w-5/6", bar)} />
          <Skeleton className={cn("h-4 w-2/3", bar)} />
          <Skeleton className={cn("h-7 w-1/2", bar)} />
        </div>
      ))}
    </Region>
  )
}

/** Image left, text right: the PDP layout. */
export function DetailSkeleton() {
  return (
    <Region label="Loading details" className="grid gap-6 md:grid-cols-2">
      <Skeleton className={cn("aspect-square", bar)} />
      <div className="flex flex-col gap-3">
        <Skeleton className={cn("h-4 w-1/4", bar)} />
        <Skeleton className={cn("h-7 w-3/4", bar)} />
        <Skeleton className={cn("h-4 w-1/3", bar)} />
        <Skeleton className={cn("h-6 w-1/2", bar)} />
        <Skeleton className={cn("h-24", bar)} />
        <Skeleton className={cn("h-9 w-1/3", bar)} />
      </div>
    </Region>
  )
}
