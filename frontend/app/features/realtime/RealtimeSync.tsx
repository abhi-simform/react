import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import {
  announceNotification,
  applyNotificationEvent,
  notificationEventSchema,
  type NotificationEvent,
} from "@/features/notifications"

import { applyOrderStatus, orderStatusEventSchema } from "./cache"
import { useSocketConnection } from "./useSocketConnection"
import { useSocketEvent } from "./useSocketEvent"

/**
 * Mounted ONCE in the root (inside auth and the router). It owns the connection and is the ONLY
 * place that listens for server events: every event becomes a Query cache update, so the UI keeps
 * a single data flow (components read the cache, they never talk to the socket). Because there is
 * exactly one subscription per event, there is exactly one toast per notification, no matter how
 * many components are mounted or how often the user navigates. Renders nothing.
 */
export function RealtimeSync() {
  useSocketConnection()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useSocketEvent("notification:new", (raw: unknown) => {
    const parsed = notificationEventSchema.safeParse(raw)
    if (!parsed.success) return
    const ev: NotificationEvent = parsed.data
    applyNotificationEvent(queryClient, ev)
    announceNotification(ev.notification.title)
    toast(ev.notification.title, {
      // The notification id as the toast id: a duplicate delivery replaces instead of stacking.
      id: `notification-${ev.notification.id}`,
      description: ev.notification.body || undefined,
      action: ev.notification.link
        ? {
            label: "View",
            onClick: () => void navigate(ev.notification.link!),
          }
        : undefined,
    })
  })

  useSocketEvent("order:status", (raw: unknown) => {
    const parsed = orderStatusEventSchema.safeParse(raw)
    if (parsed.success) applyOrderStatus(queryClient, parsed.data)
  })

  // A refund settled: the order's payment state changed, nothing else.
  useSocketEvent("order:payment", (raw: unknown) => {
    const id = (raw as { orderId?: unknown } | null)?.orderId
    if (typeof id === "string")
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
  })

  return null
}
