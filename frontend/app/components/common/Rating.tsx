import { formatCount } from "@/lib/format"
import { cn } from "@/lib/utils"

type RatingProps = {
  /** 0 to 5 */
  value: number
  count?: number
  size?: "sm" | "md"
} & React.ComponentProps<"div">

export function Rating({
  value,
  count,
  size = "md",
  className,
  ...props
}: RatingProps) {
  const clamped = Math.min(5, Math.max(0, value))
  const full = Math.round(clamped)
  return (
    <div
      role="img"
      aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
      className={cn(
        "inline-flex items-center gap-1",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
      {...props}
    >
      <span aria-hidden>{"★".repeat(full) + "☆".repeat(5 - full)}</span>
      <span aria-hidden>{clamped.toFixed(1)}</span>
      {count !== undefined && <span aria-hidden>({formatCount(count)})</span>}
    </div>
  )
}
