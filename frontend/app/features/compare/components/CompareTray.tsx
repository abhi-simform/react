import { Link } from "react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/lib/paths"

import {
  COMPARE_MAX,
  selectCompareItems,
  useCompareStore,
} from "../compareStore"
import { clearCompare, removeFromCompare } from "../undo"

/**
 * The floating tray: visible only while something is selected. It is a labelled region with
 * real buttons, so it is fully usable from the keyboard (Tab through remove, Clear and the link).
 */
export function CompareTray() {
  const items = useCompareStore(selectCompareItems)
  if (items.length === 0) return null
  return (
    <section
      aria-label="Compare tray"
      className="fixed bottom-4 left-4 z-40 flex max-w-sm flex-col gap-2 rounded border bg-background p-3 text-sm text-foreground shadow-lg"
    >
      <p className="font-medium">
        Compare ({items.length}/{COMPARE_MAX})
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <img
              src={item.imageUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded object-cover"
            />
            <span className="line-clamp-1 flex-1">{item.name}</span>
            <button
              type="button"
              className="rounded border px-1"
              aria-label={`Remove ${item.name} from compare`}
              onClick={() => removeFromCompare(item.id)}
            >
              x
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {items.length >= 2 ? (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to={paths.compare()} />}
          >
            Compare now
          </Button>
        ) : (
          <p className="text-xs text-neutral-600">Add one more to compare.</p>
        )}
        <Button size="sm" variant="outline" onClick={clearCompare}>
          Clear
        </Button>
      </div>
    </section>
  )
}
