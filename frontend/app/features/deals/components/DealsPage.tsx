import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { categoryQueries } from "@/features/catalog"
import { toApiError } from "@/lib/api/errors"

import { dealQueries } from "../queries"
import { DealCard } from "./DealCard"

/**
 * `/deals`: active deals with a category filter that lives in the URL (`?category=mobiles`).
 * Polls every 15 s (claimed bars) via the query; each card handles its own expiry.
 */
export function DealsPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get("category") ?? undefined
  const tree = useQuery(categoryQueries.tree())
  const q = useQuery(
    dealQueries.list({ status: "active", category, limit: 48 })
  )

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-2 text-xl font-medium">Deals and flash sales</h1>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <label htmlFor="deal-category">Category</label>
        <select
          id="deal-category"
          className="rounded border p-1"
          value={category ?? ""}
          onChange={(e) =>
            setParams(e.target.value ? { category: e.target.value } : {}, {
              replace: true,
            })
          }
        >
          <option value="">All categories</option>
          {(tree.data ?? []).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {q.isPending ? (
        <ListSkeleton rows={4} label="Loading deals" />
      ) : !q.data ? (
        <ErrorState
          error={toApiError(q.error)}
          onRetry={() => void q.refetch()}
        />
      ) : q.data.length === 0 ? (
        <EmptyState
          title="No deals in this category right now"
          description="Check back soon, new deals start often."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {q.data.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
