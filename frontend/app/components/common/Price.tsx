import type { PriceVM } from "@/lib/format"
import { cn } from "@/lib/utils"

type PriceProps = {
  /** Already formatted: build it with `toPriceVM` (lib/format). This component only renders. */
  price: PriceVM
  className?: string
}

export function Price({ price, className }: PriceProps) {
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-semibold">{price.current}</span>
      {price.mrp && (
        <s className="text-sm text-neutral-500">
          <span className="sr-only">MRP </span>
          {price.mrp}
        </s>
      )}
      {price.discountLabel && (
        <span className="rounded bg-green-100 px-1 text-xs text-green-800">
          {price.discountLabel}
        </span>
      )}
    </p>
  )
}
