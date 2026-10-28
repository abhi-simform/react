import { useWindowVirtualizer } from "@tanstack/react-virtual"
import { useEffect } from "react"

import { useScrollMargin } from "@/hooks/useScrollMargin"

import type { AppNotification } from "../schemas"
import { NotificationRow } from "./NotificationRow"

type Props = {
  items: readonly AppNotification[]
  /** How many exist on the server (the list may hold fewer so far). */
  total: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  onOpen: (n: AppNotification) => void
  renderActions: (n: AppNotification) => React.ReactNode
}

/**
 * The history can be thousands of rows (13.4), so only the rows near the viewport are in the DOM:
 * `useWindowVirtualizer` keeps the PAGE as the scroll container (no second scrollbar, the sticky header
 * and the preferences form below keep working) and returns the visible window of indexes.
 *
 * - Heights are DYNAMIC (a long body wraps): `estimateSize` is a guess for rows not yet seen, and
 *   `measureElement` (a ref on every rendered row, plus `data-index`) replaces the guess by the real
 *   height, so nothing jumps once a row has been on screen.
 * - Rows are `position: absolute` + `translateY` inside a container whose height is the total, so the
 *   scrollbar is right. Because only some rows exist, each carries `aria-setsize` / `aria-posinset`:
 *   a screen reader still announces "item 1,204 of 2,016".
 * - The next page loads when the last rendered row is within a few rows of the end of what we have;
 *   the "Load more" button stays as the keyboard / fallback path.
 * - Trade-offs (see docs/perf-log.md): the browser's find-in-page (Ctrl+F) only sees rendered rows;
 *   Tab only reaches rendered rows (focus is lost if a focused row scrolls out and is unmounted);
 *   anchors to a row that is not rendered cannot work. Fine for a history; wrong for a short list.
 */
export function VirtualNotificationList({
  items,
  total,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onOpen,
  renderActions,
}: Props) {
  const [listRef, scrollMargin] = useScrollMargin<HTMLUListElement>()
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 76,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => items[index]!.id,
  })
  const virtualRows = virtualizer.getVirtualItems()

  const lastIndex = virtualRows.at(-1)?.index ?? 0
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && lastIndex >= items.length - 6)
      fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, lastIndex, items.length, fetchNextPage])

  return (
    <ul
      ref={listRef}
      aria-label="Notifications"
      className="relative rounded border"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((row) => {
        const n = items[row.index]!
        return (
          <NotificationRow
            key={row.key}
            notification={n}
            onOpen={onOpen}
            actions={renderActions(n)}
            liProps={{
              "data-index": row.index,
              ref: virtualizer.measureElement,
              "aria-setsize": total,
              "aria-posinset": row.index + 1,
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start - scrollMargin}px)`,
              },
            }}
          />
        )
      })}
    </ul>
  )
}
