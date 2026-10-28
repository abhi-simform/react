import { useSyncExternalStore } from "react"

import {
  getSocketStatus,
  subscribeSocketStatus,
  type SocketStatus,
} from "@/lib/socket"

/** The connection state as an external store (components re-render only when it changes). */
export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(
    subscribeSocketStatus,
    getSocketStatus,
    () => "idle" as const
  )
}
