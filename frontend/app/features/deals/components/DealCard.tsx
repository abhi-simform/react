import { ProductCard, toProductCardVM } from "@/features/catalog"
import { formatCountdown } from "@/lib/duration"

import { useDealExpiry } from "../hooks/useDealExpiry"
import type { Deal } from "../schemas"

/**
 * One deal: a product card priced at the DEAL price with a countdown and a "claimed" bar. When the
 * (server-corrected) clock passes `endsAt` the card flips to "Ended" and shows the regular price,
 * and `useDealExpiry` refetches so the lists agree with the server.
 */
export function DealCard({ deal }: { deal: Deal }) {
  const countdown = useDealExpiry(deal.endsAt)
  const p = deal.product
  const ended = countdown.isExpired || deal.remaining <= 0
  const claimedPercent = Math.min(
    100,
    Math.round((deal.claimed / deal.stockLimit) * 100)
  )
  const vm = toProductCardVM({
    _id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    images: p.imageUrl ? [{ url: p.imageUrl }] : [],
    // Ended: the regular price comes back. Live: the deal price, with the MRP crossed out.
    price: ended ? p.price : deal.dealPrice,
    mrp: p.mrp,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    stock: Math.min(p.stock, ended ? p.stock : deal.remaining),
    sku: p.id,
  })
  return (
    <div className="flex flex-col gap-1" data-testid="deal-card">
      <ProductCard product={vm} addToCartDisabled={ended}>
        <ProductCard.Badge>
          {ended ? "Ended" : (deal.badge ?? "Deal")}
        </ProductCard.Badge>
      </ProductCard>
      <p className="text-xs">
        {ended ? (
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
      <label className="text-xs">
        {deal.remaining <= 0
          ? "Sold out"
          : `Claimed ${claimedPercent}% (${deal.remaining} left)`}
        <progress
          className="block w-full"
          max={100}
          value={claimedPercent}
          aria-label={`${p.name} deal claimed`}
        />
      </label>
    </div>
  )
}
