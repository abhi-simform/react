import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { DetailSkeleton } from "@/components/common/Skeletons"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"

import { orderQueries } from "../queries"
import { isTerminal, statusLabel } from "../status"
import { OrderStatusBadge } from "./OrderStatusBadge"

/**
 * `/orders/:orderId` (read-only, 9.10). The query polls every 5 s while the order is not in a
 * final status and stops on its own (`orderQueries.detail`). The "live" note is derived from the
 * same data and `isFetching`, never stored.
 */
export function OrderDetailPage({ orderId }: { orderId: string }) {
  const q = useQuery(orderQueries.detail(orderId))
  if (q.isPending)
    return (
      <div className="p-4">
        <DetailSkeleton />
      </div>
    )
  if (!q.data) {
    const error = toApiError(q.error)
    if (error.status === 404) throw new NotFoundError("Order", orderId)
    return (
      <div className="p-4">
        <ErrorState error={error} onRetry={() => void q.refetch()} />
      </div>
    )
  }
  const o = q.data
  const live = !isTerminal(o.status)
  return (
    <div className="mx-auto max-w-3xl p-4">
      <p className="mb-2 text-sm">
        <Link className="underline" to={paths.orders()}>
          Back to orders
        </Link>
      </p>
      <div className="mb-3 flex items-center gap-3">
        <h1 className="text-xl font-medium">Order {o.orderNumber}</h1>
        <OrderStatusBadge status={o.status} />
      </div>
      <p
        role="status"
        aria-live="polite"
        className="mb-3 text-xs text-neutral-600"
        data-testid="order-live"
      >
        {live
          ? `Live: checking for updates every 5 seconds${q.isFetching ? " (updating...)" : ""}`
          : `Final status: ${statusLabel(o.status)}. No more updates expected.`}
      </p>
      <p className="mb-3 text-sm">
        {o.paymentMethod === "cod"
          ? `Cash on delivery: pay ${formatRupees(o.pricing.total)} when it arrives.`
          : o.status === "pending_payment"
            ? "Waiting for your payment."
            : "Paid online."}{" "}
        {o.delivery?.estimatedFrom && o.delivery.estimatedTo
          ? `Estimated delivery ${formatDate(o.delivery.estimatedFrom)} to ${formatDate(o.delivery.estimatedTo)}.`
          : ""}
      </p>
      <section aria-labelledby="history" className="mb-4">
        <h2 id="history" className="font-medium">
          Status history
        </h2>
        <ol className="text-sm">
          {o.statusHistory.map((h) => (
            <li key={h.status + h.at}>
              {statusLabel(h.status)}, {formatDate(h.at)}
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="items" className="mb-4">
        <h2 id="items" className="font-medium">
          Items
        </h2>
        <ul className="text-sm">
          {o.items.map((i) => (
            <li key={i.sku} className="flex justify-between border-b py-1">
              <span>
                {i.title} x {i.qty}
              </span>
              <span>{formatRupees(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
      </section>
      <dl className="grid max-w-xs grid-cols-[1fr_auto] gap-x-4 text-sm">
        <dt>Subtotal</dt>
        <dd>{formatRupees(o.pricing.subtotal)}</dd>
        {o.pricing.discount > 0 && (
          <>
            <dt>Discount{o.coupon ? ` (${o.coupon.code})` : ""}</dt>
            <dd>-{formatRupees(o.pricing.discount)}</dd>
          </>
        )}
        <dt>Shipping</dt>
        <dd>
          {o.pricing.shipping === 0 ? "Free" : formatRupees(o.pricing.shipping)}
        </dd>
        <dt>Tax</dt>
        <dd>{formatRupees(o.pricing.tax)}</dd>
        <dt className="font-medium">Total</dt>
        <dd className="font-medium">{formatRupees(o.pricing.total)}</dd>
      </dl>
    </div>
  )
}
