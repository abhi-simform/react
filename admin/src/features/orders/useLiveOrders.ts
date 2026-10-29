import { useEffect, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { disconnectStaffSocket, onStaffEvent } from "@/lib/realtime/staffSocket"
import { qk } from "@/lib/queryKeys"

// "New orders" counter: a tiny external store, so the sidebar badge and the orders page read the same
// number. It counts `order:new` pushes since the admin last looked at the list.
let unseen = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
export const markOrdersSeen = () => {
  if (unseen) {
    unseen = 0
    emit()
  }
}
export const useUnseenOrders = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    () => unseen,
    () => 0
  )

/** Mount once in the shell, for admins only. Cleans up on sign-out/unmount. */
export function useLiveOrders(enabled: boolean) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    const offNew = onStaffEvent("order:new", (e) => {
      unseen += 1
      emit()
      toast.info(`New order ${e.orderNumber}`)
      void queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
    })
    const offStatus = onStaffEvent("order:status", (e) => {
      // Someone else (or the payment webhook) moved an order: refresh lists and that order's page.
      void queryClient.invalidateQueries({ queryKey: qk.orders.all() })
      void queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
      void e
    })
    return () => {
      offNew()
      offStatus()
      disconnectStaffSocket()
    }
  }, [enabled, queryClient])
}
