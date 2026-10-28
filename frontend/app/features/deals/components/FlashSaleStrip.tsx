import { useState } from "react"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import {
  ProductCard,
  ProductCardSkeleton,
  toProductCardVM,
  useProducts,
} from "@/features/catalog"
import type { Product } from "@/features/catalog"
import { useCountdown } from "@/hooks/useCountdown"
import { formatCountdown } from "@/lib/duration"

import { useServerTimeOffset } from "../hooks/useServerTimeOffset"

const DEFAULT_DURATION_MS = 90 * 60_000
const DEAL_QUERY = { sort: "discount", limit: 4 } as const

/** Fake "claimed" share, stable per product: derived from data we have. */
const claimedPercent = (p: Product) => 30 + (p.soldCount % 65)

/**
 * Home strip with the four deepest discounts and ONE countdown for all of
 * them. The end time is fake (now + 90 min, fixed at mount) until B4 provides
 * real deals; `endsAt` can be overridden to test the expired state.
 */
export function FlashSaleStrip({ endsAt }: { endsAt?: number }) {
  const [defaultEnd] = useState(() => Date.now() + DEFAULT_DURATION_MS)
  const serverOffsetMs = useServerTimeOffset()
  const countdown = useCountdown(endsAt ?? defaultEnd, { serverOffsetMs })
  const state = useProducts(DEAL_QUERY)

  return (
    <section aria-labelledby="flash-sale-title" className="rounded border p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="flash-sale-title" className="font-medium">
          Flash sale
        </h2>
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
      </div>
      {state.status === "error" && (
        <ErrorState error={state.error} onRetry={state.reload} />
      )}
      {(state.status === "loading" || state.status === "idle") && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <ProductCardSkeleton />
            </li>
          ))}
        </ul>
      )}
      {state.status === "success" &&
        (state.data.items.length === 0 ? (
          <EmptyState title="No deals right now" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {state.data.items.map((product) => (
              <li key={product._id} className="flex flex-col gap-1">
                <ProductCard
                  product={toProductCardVM(product)}
                  addToCartDisabled={countdown.isExpired}
                >
                  <ProductCard.Badge>
                    {countdown.isExpired ? "Deal ended" : "Lightning deal"}
                  </ProductCard.Badge>
                </ProductCard>
                <label className="text-xs">
                  Claimed {claimedPercent(product)}%
                  <progress
                    className="block w-full"
                    max={100}
                    value={claimedPercent(product)}
                  />
                </label>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
