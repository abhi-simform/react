import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { addressQueries } from "@/features/account"
import { useAuth } from "@/features/auth"
import { notificationQueries } from "@/features/notifications"
import { OrderStatusBadge, orderQueries } from "@/features/orders"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { noindexMeta } from "@/lib/seo"
import { paths } from "@/lib/paths"

/**
 * Account overview (11.10): composition of three independent sections (recent orders, notifications,
 * default address), each with its own query and its own loading / error / empty states, so a
 * failing one never blanks the page. A route composing features is fine; a feature importing a
 * sibling is not (account <-> orders would be a cycle), which is why this lives here.
 */
export default function AccountIndexRoute() {
  const { user } = useAuth()
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">Hello, {user?.name ?? "there"}</h1>
      <RecentOrders />
      <div className="grid gap-6 md:grid-cols-2">
        <NotificationsSummary />
        <DefaultAddress />
      </div>
      <nav
        aria-label="Account shortcuts"
        className="flex flex-wrap gap-3 text-sm"
      >
        <Link className="underline" to={paths.accountPage("profile")}>
          Edit profile
        </Link>
        <Link className="underline" to={paths.accountPage("security")}>
          Password and sessions
        </Link>
        <Link className="underline" to={paths.accountPage("payments")}>
          Payment history
        </Link>
        <Link className="underline" to={paths.wishlist()}>
          Wishlist
        </Link>
      </nav>
    </div>
  )
}

function Retry({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {toApiError(error).message}{" "}
      <button className="underline" onClick={onRetry}>
        Retry
      </button>
    </p>
  )
}

function RecentOrders() {
  const q = useInfiniteQuery(orderQueries.infinite({}))
  const orders = (q.data?.pages[0]?.items ?? []).slice(0, 3)
  return (
    <section aria-labelledby="overview-orders">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="overview-orders" className="font-medium">
          Recent orders
        </h2>
        <Link className="text-sm underline" to={paths.orders()}>
          All orders
        </Link>
      </div>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading orders...
        </p>
      ) : q.isError ? (
        <Retry error={q.error} onRetry={() => void q.refetch()} />
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No orders yet.{" "}
          <Link className="underline" to={paths.products()}>
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="rounded border">
          {orders.map((o) => (
            <li
              key={o._id}
              className="flex items-center justify-between gap-2 border-b p-2 text-sm last:border-b-0"
            >
              <Link className="underline" to={paths.order(o._id)}>
                {o.orderNumber}
              </Link>
              <span className="text-muted-foreground">
                {formatDate(o.createdAt)}
              </span>
              <OrderStatusBadge status={o.status} />
              <span>{formatRupees(o.pricing.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NotificationsSummary() {
  const q = useQuery(notificationQueries.unreadCount())
  return (
    <section aria-labelledby="overview-notifications">
      <h2 id="overview-notifications" className="mb-2 font-medium">
        Notifications
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading...
        </p>
      ) : q.isError ? (
        <Retry error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <p className="text-sm">
          {q.data === 0 ? "You are all caught up." : `${q.data} unread.`}{" "}
          <Link className="underline" to={paths.accountPage("notifications")}>
            Open notifications
          </Link>
        </p>
      )}
    </section>
  )
}

function DefaultAddress() {
  const q = useQuery(addressQueries.list())
  const address = q.data?.find((a) => a.isDefault) ?? q.data?.[0]
  return (
    <section aria-labelledby="overview-address">
      <h2 id="overview-address" className="mb-2 font-medium">
        Default address
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading...
        </p>
      ) : q.isError ? (
        <Retry error={q.error} onRetry={() => void q.refetch()} />
      ) : !address ? (
        <p className="text-sm text-muted-foreground">
          No saved address.{" "}
          <Link className="underline" to={paths.accountPage("addresses")}>
            Add one
          </Link>
        </p>
      ) : (
        <p className="text-sm">
          {address.fullName}, {address.line1}, {address.city} {address.pincode}.{" "}
          <Link className="underline" to={paths.accountPage("addresses")}>
            Manage addresses
          </Link>
        </p>
      )}
    </section>
  )
}

export function meta() {
  return noindexMeta("Account")
}
