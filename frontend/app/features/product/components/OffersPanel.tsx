import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { formatDate, formatRupees } from "@/lib/format"
import { toApiError } from "@/lib/api/errors"

import type { Offer } from "../offers.api"
import { offerQueries } from "../queries"

function describe(o: Offer): string {
  const what =
    o.type === "percent"
      ? `${o.value}% off${o.maxDiscount ? `, up to ${formatRupees(o.maxDiscount)}` : ""}`
      : `${formatRupees(o.value)} off`
  const min =
    o.minOrder > 0 ? ` on orders from ${formatRupees(o.minOrder)}` : ""
  const until = o.expiresAt ? `. Ends ${formatDate(o.expiresAt)}` : ""
  return `${what}${min}${until}`
}

async function copy(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success(`Copied ${code}`, { id: `offer-${code}` })
  } catch {
    toast.error("Could not copy. Type the code at checkout instead.")
  }
}

/**
 * "Offers" on the product page: the live coupons from the API (there are no bank offers in this
 * API), each with a copy button; applying one happens in the cart, which also says whether it fits.
 * Own query, own loading/error/empty states; no offers = no panel.
 */
export function OffersPanel() {
  const q = useQuery(offerQueries.list())
  if (q.isSuccess && q.data.length === 0) return null
  return (
    <section
      aria-labelledby="offers-title"
      className="rounded border p-3 text-sm"
    >
      <h2 id="offers-title" className="mb-1 font-medium">
        Offers
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true">
          Loading offers...
        </p>
      ) : q.isError ? (
        <p role="alert" className="text-destructive">
          Could not load offers ({toApiError(q.error).message}).{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {q.data.map((o) => (
            <li key={o.code} className="flex items-start justify-between gap-2">
              <span>
                <code className="rounded bg-muted px-1 font-mono">
                  {o.code}
                </code>{" "}
                {o.description}
                <span className="block text-xs text-muted-foreground">
                  {describe(o)}
                </span>
              </span>
              <button
                type="button"
                className="shrink-0 text-xs underline"
                aria-label={`Copy code ${o.code}`}
                onClick={() => void copy(o.code)}
              >
                Copy
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Apply a code in your cart; it checks whether it fits.
      </p>
    </section>
  )
}
