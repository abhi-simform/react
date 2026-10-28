import { useOnlineStatus } from "@/hooks/useOnlineStatus"

import { useSocketStatus } from "./useSocketStatus"

/** DEV only: the socket state in the header (`live`, `connecting`, `offline`, ...). */
export function ConnectionIndicator() {
  const status = useSocketStatus()
  const online = useOnlineStatus()
  if (!import.meta.env.DEV || status === "idle") return null
  const label = !online ? "offline" : status === "connected" ? "live" : status
  return (
    <span
      data-testid="socket-status"
      title={`Realtime connection: ${label}`}
      className="rounded border px-1 text-xs text-muted-foreground"
    >
      <span aria-hidden>{status === "connected" && online ? "● " : "○ "}</span>
      {label}
    </span>
  )
}
