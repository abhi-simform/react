import { useInfiniteQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { useSearchParams } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"

import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
} from "../hooks/useNotificationActions"
import { notificationQueries } from "../queries"
import {
  CATEGORIES,
  type NotificationCategory,
  type NotificationFilter,
} from "../schemas"
import { lazyNamed } from "@/lib/lazyNamed"

// 13.3: the virtualiser (~10 kB gzip) loads with this list, not with every page.
const VirtualNotificationList = lazyNamed(
  () => import("./VirtualNotificationList"),
  "VirtualNotificationList"
)
import { PreferencesForm } from "./PreferencesForm"

const isCategory = (v: string | null): v is NotificationCategory =>
  CATEGORIES.some((c) => c === v)

/**
 * `/account/notifications`: the full history (infinite and VIRTUALISED: see VirtualNotificationList), filters in the URL
 * (`?unread=1&category=orders`), mark read / delete, and the preference switches below.
 */
export function NotificationsPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get("category")
  const filter: NotificationFilter = {
    unread: params.get("unread") === "1" ? true : undefined,
    category: isCategory(category) ? category : undefined,
  }
  const q = useInfiniteQuery(notificationQueries.infinite(filter))
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const remove = useDeleteNotification()

  function setFilter(next: { unread?: boolean; category?: string }) {
    setParams(
      (cur) => {
        const p = new URLSearchParams(cur)
        if ("unread" in next) {
          if (next.unread) p.set("unread", "1")
          else p.delete("unread")
        }
        if ("category" in next) {
          if (next.category) p.set("category", next.category)
          else p.delete("category")
        }
        return p
      },
      { replace: true }
    )
  }

  const items = q.data?.pages.flatMap((p) => p.items) ?? []
  const unreadTotal = q.data?.pages[0]?.meta.unreadCount ?? 0

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="notifications-title">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 id="notifications-title" className="text-xl font-medium">
            Notifications
          </h1>
          <Button
            size="sm"
            variant="outline"
            disabled={unreadTotal === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={filter.unread === true}
              onChange={(e) => setFilter({ unread: e.target.checked })}
            />
            Unread only
          </label>
          <label className="flex items-center gap-1">
            Category
            <select
              className="rounded border p-1"
              value={filter.category ?? ""}
              onChange={(e) => setFilter({ category: e.target.value })}
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0]!.toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {q.isPending ? (
          <p role="status">Loading notifications...</p>
        ) : q.isError ? (
          <ErrorState
            error={toApiError(q.error)}
            onRetry={() => void q.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              filter.unread ? "No unread notifications" : "Nothing here yet"
            }
            description="Order and offer updates will show up here as they happen."
          />
        ) : (
          <>
            <p
              role="status"
              data-testid="notification-count"
              className="mb-1 text-xs text-muted-foreground"
            >
              Loaded {items.length.toLocaleString("en-IN")} of{" "}
              {(q.data?.pages[0]?.meta.total ?? items.length).toLocaleString(
                "en-IN"
              )}
            </p>
            <Suspense
              fallback={
                <p role="status" className="min-h-40">
                  Loading list...
                </p>
              }
            >
              <VirtualNotificationList
                items={items}
                total={q.data?.pages[0]?.meta.total ?? items.length}
                hasNextPage={q.hasNextPage}
                isFetchingNextPage={q.isFetchingNextPage}
                fetchNextPage={() => void q.fetchNextPage()}
                onOpen={(x) => {
                  if (!x.read) markRead.mutate(x.id)
                }}
                renderActions={(n) => (
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {!n.read && (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => markRead.mutate(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      type="button"
                      className="underline"
                      aria-label={`Delete: ${n.title}`}
                      onClick={() => remove.mutate(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              />
            </Suspense>
            {q.hasNextPage && (
              <Button
                className="mt-3"
                variant="outline"
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            )}
          </>
        )}
      </section>

      <PreferencesForm />
    </div>
  )
}
