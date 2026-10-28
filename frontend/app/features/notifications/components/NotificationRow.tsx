import { Link } from "react-router"

import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

import { safeSitePath } from "../link"
import type { AppNotification } from "../schemas"

/**
 * One notification: unread ones are bold with a dot (and "Unread" for screen readers, colour is
 * never the only signal). The title is a link when the notification has a same-site target; the
 * click handler marks it read (the caller decides what else, e.g. close the dropdown).
 */
export function NotificationRow({
  notification: n,
  onOpen,
  actions,
}: {
  notification: AppNotification
  onOpen: (n: AppNotification) => void
  actions?: React.ReactNode
}) {
  const href = safeSitePath(n.link)
  const title = (
    <span className={cn(!n.read && "font-semibold")}>{n.title}</span>
  )
  return (
    <li
      data-testid="notification"
      data-read={n.read}
      className="flex items-start gap-2 border-b px-2 py-2 text-sm last:border-b-0"
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          n.read ? "bg-transparent" : "bg-teal-600"
        )}
      />
      <div className="min-w-0 flex-1">
        {!n.read && <span className="sr-only">Unread: </span>}
        {href ? (
          <Link to={href} className="underline" onClick={() => onOpen(n)}>
            {title}
          </Link>
        ) : (
          <button
            type="button"
            className="text-left underline"
            onClick={() => onOpen(n)}
          >
            {title}
          </button>
        )}
        {n.body && <p className="text-neutral-700">{n.body}</p>}
        <time dateTime={n.createdAt} className="text-xs text-neutral-500">
          {formatRelative(n.createdAt)}
        </time>
      </div>
      {actions}
    </li>
  )
}
