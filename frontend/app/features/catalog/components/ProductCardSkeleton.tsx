/** Same outer shape as ProductCard so the layout does not jump when data arrives. */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse flex-col gap-2 rounded-lg border p-2"
    >
      <div className="aspect-square rounded bg-neutral-200" />
      <div className="h-3 w-1/3 rounded bg-neutral-200" />
      <div className="h-4 w-full rounded bg-neutral-200" />
      <div className="h-4 w-1/2 rounded bg-neutral-200" />
      <div className="h-8 rounded bg-neutral-200" />
    </div>
  )
}
