import { Link } from "react-router"

import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { paths } from "@/lib/paths"

/**
 * A page-level statement that THIS page needs a connection (cart, checkout): rendered only while offline,
 * where the page would otherwise show confusing request errors or let someone press "Place order" and fail.
 * Pages pair it with `useOnlineStatus()` to disable their primary action.
 */
export function OfflineNotice({ what }: { what: string }) {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="alert"
      className="mb-3 rounded border border-warning bg-warning-muted p-3 text-sm text-warning"
    >
      <p className="font-medium">You are offline</p>
      <p>
        {what} needs a connection. Nothing is lost: your cart is kept and you
        can continue as soon as you are back online.{" "}
        <Link className="underline" to={paths.offline()}>
          See what is available offline
        </Link>
        .
      </p>
    </div>
  )
}
