import { useQuery } from "@tanstack/react-query"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ProductCardSkeleton } from "@/features/catalog"
import { useCountdown } from "@/hooks/useCountdown"
import { toApiError } from "@/lib/api/errors"
import { formatCountdown } from "@/lib/duration"

import { useServerTimeOffset } from "../hooks/useServerTimeOffset"
import { dealQueries } from "../queries"
import { DealCard } from "./DealCard"

const STRIP_QUERY = { status: "active", limit: 4 } as const

/**
 * Home strip, backed by `GET /deals` (11.2; it was a fixed "now + 90 min" with fake claims before
 * B4). The header counts down to the soonest-ending deal; every card has its own end time,
 * "claimed" bar and Ended state (`DealCard`). `endsAt` overrides the header's target: the
 * /dev/countdown lab uses it to watch the expired state without waiting.
 */
export function FlashSaleStrip({ endsAt }: { endsAt?: number }) {
  const q = useQuery(dealQueries.list(STRIP_QUERY))
  const serverOffsetMs = useServerTimeOffset()
  const soonest = q.data
    ?.map((d) => new Date(d.endsAt).getTime())
    .sort((a, b) => a - b)[0]
  const countdown = useCountdown(endsAt ?? soonest ?? 0, { serverOffsetMs })
  const hasDeals = (q.data?.length ?? 0) > 0

  return (
    <section aria-labelledby="flash-sale-title" className="rounded border p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="flash-sale-title" className="font-medium">
          Flash sale
        </h2>
        {hasDeals && (
          <p>
            {countdown.isExpired ? (
              <strong>Deal ended</strong>
            ) : (
              <>
                Ends in{" "}
                <time role="timer" className="font-mono font-semibold">
                  {formatCountdown(countdown)}
                </time>
              </>
            )}
          </p>
        )}
      </div>
      {q.isPending ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      ) : !q.data ? (
        <ErrorState
          error={toApiError(q.error)}
          onRetry={() => void q.refetch()}
        />
      ) : !hasDeals ? (
        <EmptyState title="No deals right now" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {q.data.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
