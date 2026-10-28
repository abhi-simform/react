import { useOnlineStatus } from "@/hooks/useOnlineStatus"

/** Polite live region: announced when the connection drops, gone when it returns. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="bg-warning-muted p-2 text-center text-sm text-warning">
          You are offline. Showing what we already have; new requests will fail
          until you reconnect.
        </p>
      )}
    </div>
  )
}
