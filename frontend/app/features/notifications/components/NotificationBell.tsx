import { Popover } from "@base-ui/react/popover"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router"

import { useAuth } from "@/features/auth"
import { paths } from "@/lib/paths"

import { useAnnouncement } from "../announce"
import { useMarkAllRead, useMarkRead } from "../hooks/useNotificationActions"
import { notificationQueries } from "../queries"
import type { AppNotification } from "../schemas"
import { NotificationRow } from "./NotificationRow"

/**
 * The bell (11.9): unread badge from `GET /notifications/unread-count`, a Popover (base-ui: focus
 * moves into it, Escape closes, focus returns to the button) with the 10 newest. The data stays
 * current through the socket (`RealtimeSync` writes the Query cache), so this component has NO
 * socket code and cannot leak a listener. Only mounted for signed-in users.
 */
export function NotificationBell() {
  const { status } = useAuth()
  if (status !== "authenticated") return null
  return <Bell />
}

function Bell() {
  const [open, setOpen] = useState(false)
  const unread = useQuery(notificationQueries.unreadCount())
  const latest = useQuery({ ...notificationQueries.latest(), enabled: open })
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const count = unread.data ?? 0

  const announcement = useAnnouncement()

  function onOpenRow(n: AppNotification) {
    if (!n.read) markRead.mutate(n.id)
    setOpen(false)
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-label={
            count > 0 ? `Notifications, ${count} unread` : "Notifications"
          }
          className="relative rounded border px-2 py-1 text-sm"
        >
          <span aria-hidden>Bell</span>
          {count > 0 && (
            <span
              data-testid="bell-badge"
              aria-hidden
              className="ml-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="end" className="z-30">
            <Popover.Popup className="w-80 max-w-[calc(100vw-1rem)] rounded border bg-white p-2 shadow-lg dark:bg-neutral-900">
              <div className="flex items-center justify-between px-2 pb-1">
                <Popover.Title className="font-medium">
                  Notifications
                </Popover.Title>
                <button
                  type="button"
                  className="text-xs underline disabled:no-underline disabled:opacity-50"
                  disabled={count === 0 || markAll.isPending}
                  onClick={() => markAll.mutate()}
                >
                  Mark all read
                </button>
              </div>
              {latest.isPending ? (
                <p role="status" className="px-2 py-4 text-sm">
                  Loading...
                </p>
              ) : latest.isError ? (
                <p role="alert" className="px-2 py-4 text-sm text-red-700">
                  Could not load notifications.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void latest.refetch()}
                  >
                    Retry
                  </button>
                </p>
              ) : latest.data.length === 0 ? (
                <p className="px-2 py-4 text-sm text-neutral-600">
                  Nothing yet. Order updates will show up here.
                </p>
              ) : (
                <ul className="max-h-96 overflow-y-auto">
                  {latest.data.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onOpen={onOpenRow}
                    />
                  ))}
                </ul>
              )}
              <div className="px-2 pt-2 text-sm">
                <Link
                  className="underline"
                  to={paths.accountPage("notifications")}
                  onClick={() => setOpen(false)}
                >
                  See all notifications
                </Link>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  )
}
