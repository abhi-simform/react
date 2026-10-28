import { Scale } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  selectIsComparing,
  useCompareStore,
  type CompareItem,
} from "../compareStore"
import { toggleCompare } from "../toggleCompare"

/**
 * "Compare" toggle for cards and the PDP. The selector answers ONE boolean for this product,
 * so adding product X re-renders only X's toggle, not every card on the page. A real
 * `<button aria-pressed>`: Enter/Space work and the state is announced.
 */
export function CompareToggle({
  item,
  className,
}: {
  item: CompareItem
  className?: string
}) {
  const comparing = useCompareStore(selectIsComparing(item.id))
  return (
    <button
      type="button"
      aria-pressed={comparing}
      aria-label={`Compare: ${item.name}`}
      onClick={() => toggleCompare(item)}
      className={cn(
        "flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs aria-pressed:bg-foreground aria-pressed:text-background",
        className
      )}
    >
      <Scale aria-hidden className="size-3" />
      Compare
    </button>
  )
}
