import { useInfiniteQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useSearchParams } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { LoadMoreSentinel } from "@/components/common/LoadMoreSentinel"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { paths } from "@/lib/paths"
import type { OrderStatus } from "@/types/domain"

import { orderQueries } from "../queries"
import { statusLabel } from "../status"
import { OrderStatusBadge } from "./OrderStatusBadge"

const CHIPS: readonly OrderStatus[] = [
  "pending_payment",
  "placed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
  "refunded",
]
const asStatus = (v: string | null): OrderStatus | undefined =>
  CHIPS.find((c) => c === v)

/**
 * `/orders` (9.10): an infinite list whose filters live in the URL (`?status=shipped&q=SS-10`),
 * so a filtered list is linkable and Back works. The filter object is the query key.
 */
export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = asStatus(params.get("status"))
  const q = params.get("q") ?? ""
  const [draft, setDraft] = useState(q)
  const orders = useInfiniteQuery({
    ...orderQueries.infinite({ status, search: q || undefined }),
    select: (d) => ({
      items: d.pages.flatMap((p) => p.items),
      total: d.pages.at(-1)!.meta.total,
    }),
  })

  function setFilter(key: "status" | "q", value: string | undefined) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-medium">Your orders</h1>
      </div>
      <form
        role="search"
        className="mb-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setFilter("q", draft.trim() || undefined)
        }}
      >
        <label className="sr-only" htmlFor="order-search">
          Search by order number
        </label>
        <input
          id="order-search"
          className="rounded border p-1"
          placeholder="Order number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
      <div
        role="group"
        aria-label="Filter by status"
        className="mb-3 flex flex-wrap gap-2"
      >
        <Button
          size="sm"
          variant={status ? "outline" : "default"}
          aria-pressed={!status}
          onClick={() => setFilter("status", undefined)}
        >
          All
        </Button>
        {CHIPS.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={status === c ? "default" : "outline"}
            aria-pressed={status === c}
            onClick={() => setFilter("status", c)}
          >
            {statusLabel(c)}
          </Button>
        ))}
      </div>

      {orders.isPending ? (
        <ListSkeleton rows={4} label="Loading orders" />
      ) : !orders.data ? (
        <ErrorState
          error={toApiError(orders.error)}
          onRetry={() => void orders.refetch()}
        />
      ) : orders.data.items.length === 0 ? (
        <EmptyState
          title="No orders match"
          description="Try another status or order number."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {orders.data.items.map((o) => (
              <li
                key={o._id}
                className="flex items-center justify-between gap-3 rounded border p-3 text-sm"
              >
                <div>
                  <Link
                    className="font-medium underline"
                    to={paths.order(o._id)}
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(o.createdAt)}, {o.items.length}{" "}
                    {o.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="text-end">
                  <OrderStatusBadge status={o.status} />
                  <p>{formatRupees(o.pricing.total)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div
            className="mt-3 flex flex-col items-center gap-2"
            aria-busy={orders.isFetchingNextPage}
          >
            {orders.isFetchNextPageError && (
              <ErrorState
                error={toApiError(orders.error)}
                onRetry={() => void orders.fetchNextPage()}
              />
            )}
            {orders.hasNextPage ? (
              <>
                <Button
                  variant="outline"
                  disabled={orders.isFetchingNextPage}
                  onClick={() => void orders.fetchNextPage()}
                >
                  {orders.isFetchingNextPage
                    ? "Loading..."
                    : "Load more orders"}
                </Button>
                <LoadMoreSentinel
                  enabled={
                    !orders.isFetchingNextPage && !orders.isFetchNextPageError
                  }
                  itemCount={orders.data.items.length}
                  onVisible={() => void orders.fetchNextPage()}
                />
              </>
            ) : (
              <p role="status" className="text-xs text-muted-foreground">
                {orders.data.total}{" "}
                {orders.data.total === 1 ? "order" : "orders"} in total.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
