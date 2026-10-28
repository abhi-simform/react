import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Below 1024px the filters live in a left drawer. base-ui's dialog gives the
 * focus trap, Escape to close and "focus returns to the trigger".
 */
export function FiltersSheet({
  activeCount,
  total,
  children,
}: {
  activeCount: number
  total?: number
  children: React.ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontal aria-hidden className="size-4" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="p-4">{children}</div>
        <div className="p-4">
          <SheetClose render={<Button className="w-full" />}>
            Show {total ?? ""} results
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
