import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { DetailSkeleton } from "@/components/common/Skeletons"
import { PaymentPanel, paymentQueries } from "@/features/payments"
import { useSocketStatus } from "@/features/realtime"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"
import type { Order } from "@/types/domain"

import {
  ACTIVE_POLL_MS,
  orderQueries,
  PENDING_POLL_MS,
  restartPendingPolling,
} from "../queries"
import { isTerminal, statusLabel } from "../status"
import { OrderActions } from "./OrderActions"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { OrderTimeline } from "./OrderTimeline"
import { PayAnotherWay } from "./PayAnotherWay"
import { ReturnStatus } from "./ReturnStatus"

/**
 * `/orders/:orderId` (9.10, 11.5): tracking timeline from `statusHistory`, status-driven actions
 * (cancel, return, invoice, buy again), payment and refund state, price breakdown. The query polls
 * (3 s while waiting for a payment, 10 s while active) and stops at a terminal status; 11.9 swaps
 * the polling for live events.
 */
export function OrderDetailPage({ orderId }: { orderId: string }) {
  // Live events (11.9) replace polling while the socket is up; polling is the fallback.
  const connected = useSocketStatus() === "connected"
  const q = useQuery(orderQueries.detail(orderId, { poll: !connected }))
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
  const seconds =
    (o.status === "pending_payment" ? PENDING_POLL_MS : ACTIVE_POLL_MS) / 1000
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
        className="mb-3 text-xs text-muted-foreground"
        data-testid="order-live"
      >
        {live
          ? connected && o.status !== "pending_payment"
            ? "Live: updates appear here as they happen."
            : `${connected ? "Live" : "Reconnecting"}: checking for updates every ${seconds} seconds${q.isFetching ? " (updating...)" : ""}`
          : `Final status: ${statusLabel(o.status)}. No more updates expected.`}
      </p>

      {o.status === "pending_payment" && o.paymentMethod === "razorpay" && (
        <div className="mb-4">
          <PaymentPanel
            order={o}
            onCheckNow={() => restartPendingPolling(o._id)}
            extra={<PayAnotherWay order={o} />}
          />
        </div>
      )}

      <OrderActions order={o} />

      <section aria-labelledby="tracking" className="mb-4">
        <h2 id="tracking" className="mb-1 font-medium">
          Tracking
        </h2>
        <OrderTimeline order={o} eta={o.delivery?.estimatedTo} />
        {o.delivery?.estimatedFrom && o.delivery.estimatedTo && live && (
          <p className="mt-1 text-xs text-muted-foreground">
            Estimated delivery {formatDate(o.delivery.estimatedFrom)} to{" "}
            {formatDate(o.delivery.estimatedTo)}.
          </p>
        )}
      </section>

      <ReturnStatus order={o} />

      <PaymentSummary order={o} />

      <section aria-labelledby="address" className="mb-4 text-sm">
        <h2 id="address" className="font-medium">
          Delivery address
        </h2>
        <p>
          {o.addressSnapshot.fullName}, {o.addressSnapshot.line1}
          {o.addressSnapshot.line2 ? `, ${o.addressSnapshot.line2}` : ""},{" "}
          {o.addressSnapshot.city}, {o.addressSnapshot.state}{" "}
          {o.addressSnapshot.pincode}. Phone {o.addressSnapshot.phone}
        </p>
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

/** Payment method and, for online orders, the money trail (paid, refund in progress, refunded). */
function PaymentSummary({ order: o }: { order: Order }) {
  const refunding = [
    "refund_pending",
    "partially_refunded",
    "refunded",
  ].includes(o.paymentStatus ?? "")
  const payments = useInfiniteQuery({
    ...paymentQueries.infinite({ orderId: o._id }),
    enabled: o.paymentMethod === "razorpay" && refunding,
  })
  const payment = payments.data?.pages[0]?.items[0]
  return (
    <section aria-labelledby="payment" className="mb-4 text-sm">
      <h2 id="payment" className="font-medium">
        Payment
      </h2>
      <p data-testid="payment-summary">
        {o.paymentMethod === "cod"
          ? o.paymentStatus === "paid"
            ? "Cash on delivery: paid."
            : `Cash on delivery: pay ${formatRupees(o.pricing.total)} when it arrives.`
          : o.status === "pending_payment"
            ? "Online payment: waiting for your payment."
            : o.paymentStatus === "refund_pending"
              ? "Paid online. Refund in progress."
              : o.paymentStatus === "refunded"
                ? "Paid online. Refunded to your original payment method."
                : o.paymentStatus === "partially_refunded"
                  ? "Paid online. Partly refunded."
                  : "Paid online."}
      </p>
      {payment && payment.refunds.length > 0 && (
        <ul aria-label="Refunds" className="text-xs text-foreground">
          {payment.refunds.map((r) => (
            <li key={r.createdAt}>
              {formatRupees(r.amount)}:{" "}
              {r.status === "processed"
                ? `refunded ${r.processedAt ? formatDate(r.processedAt) : ""}`
                : r.status === "pending"
                  ? "refund in progress (usually 5 to 7 working days for your bank)"
                  : "refund failed, contact support"}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
