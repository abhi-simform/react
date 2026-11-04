import { formatRupees } from "@/lib/format"
import { cn } from "@/lib/utils"

type PriceProps = {
  /** Selling price in whole rupees. */
  price: number
  /** Maximum retail price; shown struck through when higher than `price`. */
  mrp?: number
  className?: string
}

export function Price({ price, mrp, className }: PriceProps) {
  const hasDiscount = mrp !== undefined && mrp > price
  const percent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-semibold">{formatRupees(price)}</span>
      {hasDiscount && (
        <>
          <s className="text-sm text-neutral-500">
            <span className="sr-only">MRP </span>
            {formatRupees(mrp)}
          </s>
          <span className="rounded bg-green-100 px-1 text-xs text-green-800">
            {percent}% off
          </span>
        </>
      )}
    </p>
  )
}
