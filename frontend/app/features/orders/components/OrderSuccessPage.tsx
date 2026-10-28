import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { ErrorState } from "@/components/common/ErrorState"
import { DetailSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"

import { PaymentPanel } from "@/features/payments"

import { orderQueries, restartPendingPolling } from "../queries"
import { OrderStatusBadge } from "./OrderStatusBadge"
import { PayAnotherWay } from "./PayAnotherWay"

/**
 * `/checkout/success/:orderId` (11.3). Loads the order by id, so it works after a refresh (the
 * route is protected, and another user's id is a 404). Right after placing, the created order is
 * already in the cache (`usePlaceOrder` writes it), so it renders without a request.
 */
export function OrderSuccessPage({ orderId }: { orderId: string }) {
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
  const awaitingPayment = o.status === "pending_payment"
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
      <h1 className="text-xl font-medium" data-testid="order-success">
        {awaitingPayment
          ? "Order created: payment pending"
          : "Thank you, your order is placed"}
      </h1>
      <p>
        Order number: <strong>{o.orderNumber}</strong>{" "}
        <OrderStatusBadge status={o.status} />
      </p>
      {awaitingPayment ? (
        <PaymentPanel
          order={o}
          onCheckNow={() => restartPendingPolling(o._id)}
          extra={<PayAnotherWay order={o} />}
        />
      ) : o.paymentMethod === "cod" ? (
        <p className="text-sm">
          Pay {formatRupees(o.pricing.total)} in cash when it arrives.
        </p>
      ) : (
        <p className="text-sm" data-testid="paid-note">
          Payment received: {formatRupees(o.pricing.total)} paid online.
        </p>
      )}
      {o.delivery?.estimatedFrom && o.delivery.estimatedTo && (
        <p className="text-sm">
          Estimated delivery: {formatDate(o.delivery.estimatedFrom)} to{" "}
          {formatDate(o.delivery.estimatedTo)}
        </p>
      )}
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
      <p className="text-sm font-medium">
        Total: {formatRupees(o.pricing.total)}
      </p>
      <p className="text-sm">
        Deliver to: {o.addressSnapshot.fullName}, {o.addressSnapshot.line1},{" "}
        {o.addressSnapshot.city} {o.addressSnapshot.pincode}
      </p>
      <div className="flex gap-2">
        <Button nativeButton={false} render={<Link to={paths.order(o._id)} />}>
          Track order
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to={paths.products()} />}
        >
          Continue shopping
        </Button>
      </div>
      {import.meta.env.DEV && (
        <p className="text-xs text-neutral-600">
          Dev: the confirmation email is in Mailpit at http://localhost:8025.
        </p>
      )}
    </div>
  )
}
