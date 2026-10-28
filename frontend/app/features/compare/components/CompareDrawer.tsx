import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { paths } from "@/lib/paths"

import {
  COMPARE_MAX,
  selectCompareItems,
  useCompareStore,
} from "../compareStore"
import { clearCompare, removeFromCompare } from "../undo"

/**
 * The compare list in a bottom sheet (opened from the header). Rarely opened, so it is
 * loaded on demand: see `LazyCompareDrawer`. Same store as the floating tray.
 */
export function CompareDrawer({ onClose }: { onClose: () => void }) {
  const items = useCompareStore(selectCompareItems)
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Compare products</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? `Nothing to compare yet. Add up to ${COMPARE_MAX} products from a listing.`
              : `${items.length} of ${COMPARE_MAX} selected.`}
          </SheetDescription>
        </SheetHeader>
        {items.length > 0 && (
          <div className="flex flex-col gap-2 p-4">
            <ul className="flex flex-col gap-1 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="flex-1">{item.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeFromCompare(item.id)}
                  >
                    Remove<span className="sr-only"> {item.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                size="sm"
                nativeButton={false}
                render={<Link to={paths.compare()} onClick={onClose} />}
              >
                Open comparison
              </Button>
              <Button size="sm" variant="outline" onClick={clearCompare}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
