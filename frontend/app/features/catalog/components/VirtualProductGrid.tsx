import { useWindowVirtualizer } from "@tanstack/react-virtual"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useScrollMargin } from "@/hooks/useScrollMargin"
import { cn } from "@/lib/utils"

import { ProductCard, type ProductCardProduct } from "./ProductCard"

/**
 * The "load more" feed (13.4) can hold hundreds of cards (300 cards = ~9,000 DOM nodes), so only the
 * ROWS near the viewport are rendered. Same columns as `ProductGrid` (2/3/4/5 at base/md/lg/xl; 1 in
 * list view), computed here with the same media queries so the JS row split and the CSS grid agree.
 *
 * Virtualization is by ROW: row `r` holds products `r*columns .. r*columns+columns-1`, and it is the row
 * that is measured (`measureElement`), so equal-height cards in one row need no per-card sizing. A window
 * virtualizer keeps the page as the scroller. See `VirtualNotificationList` for the mechanics and for
 * the accessibility trade-offs (this one also keeps `role=list/listitem` + `aria-posinset/setsize`).
 */
export function VirtualProductGrid({
  products,
  view = "grid",
}: {
  products: readonly ProductCardProduct[]
  view?: "grid" | "list"
}) {
  const md = useMediaQuery("(min-width: 768px)")
  const lg = useMediaQuery("(min-width: 1024px)")
  const xl = useMediaQuery("(min-width: 1280px)")
  const columns = view === "list" ? 1 : xl ? 5 : lg ? 4 : md ? 3 : 2
  const rowCount = Math.ceil(products.length / columns)

  const [listRef, scrollMargin] = useScrollMargin<HTMLDivElement>()
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    // A card is ~380 px tall in the grid, ~170 px in a list: only a guess for rows not seen yet.
    estimateSize: () => (view === "grid" ? 400 : 180),
    overscan: 3,
    scrollMargin,
    // Stable keys per row: the first product's id (the row survives filter changes that keep its first card).
    getItemKey: (row) => products[row * columns]?.id ?? row,
  })

  return (
    <div
      ref={listRef}
      role="list"
      aria-label="Products"
      className="relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const start = row.index * columns
        return (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className={cn(
              "absolute start-0 top-0 grid w-full gap-3 pb-3",
              view === "grid"
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-1"
            )}
            style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
          >
            {products.slice(start, start + columns).map((product, i) => (
              <div
                key={product.id}
                role="listitem"
                aria-setsize={products.length}
                aria-posinset={start + i + 1}
              >
                <ProductCard
                  product={product}
                  imagePriority={row.index === 0}
                />
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
