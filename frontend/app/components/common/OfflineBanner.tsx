import { useOnlineStatus } from "@/hooks/useOnlineStatus"

/** Polite live region: announced when the connection drops, gone when it returns. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="bg-amber-100 p-2 text-center text-sm text-amber-900">
          You are offline. Showing what we already have; new requests will fail
          until you reconnect.
        </p>
      )}
    </div>
  )
}
