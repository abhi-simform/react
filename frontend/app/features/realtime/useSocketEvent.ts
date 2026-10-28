import { useEffect } from "react"

import { useLatest } from "@/hooks/useLatest"
import { getSocket } from "@/lib/socket"

/**
 * Subscribe to a socket event for the lifetime of the component. Two things make it safe:
 * - cleanup calls `off` with the SAME function, so unmounting (or navigating away) removes the
 *   listener: forgetting this is what produces "two toasts after every navigation";
 * - the handler lives in a ref (`useLatest`), so a new handler identity on every render does NOT
 *   re-subscribe (the effect depends on the event name only) and the newest handler always runs.
 */
export function useSocketEvent<Args extends unknown[]>(
  event: string,
  handler: (...args: Args) => void
) {
  const latest = useLatest(handler)
  useEffect(() => {
    const socket = getSocket()
    const listener = (...args: unknown[]) => latest.current(...(args as Args))
    socket.on(event, listener)
    return () => {
      socket.off(event, listener)
    }
  }, [event, latest])
}
