import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { useAuth, refreshSession } from "@/features/auth"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import { notificationKeys, orderKeys } from "@/lib/queryKeys"
import {
  connectSocket,
  getSocket,
  reconnectSocket,
  releaseSocket,
} from "@/lib/socket"

/** Handshake refusals that a fresh access token can fix (the API's `err.data.code`). */
const AUTH_CODES = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "UNAUTHORIZED"])
/** In a row: after this many failed token-refresh reconnects we stop (the session is probably gone). */
const MAX_AUTH_RETRIES = 3

/**
 * Own the connection (mounted ONCE, in `RealtimeSync`):
 * - signed in -> connect; signed out / another user -> disconnect (so one user never receives the
 *   next user's events; the cache is wiped by `SessionCacheSync`).
 * - `connect_error` with an AUTH code (expired token): refresh the access token, then connect
 *   again. A refused handshake is NOT retried by Socket.io itself (it only retries transport
 *   failures), so the manual reconnect is required. Bounded, so a dead session cannot loop.
 * - the server disconnects a socket when its token expires (`io server disconnect`, also not
 *   retried by Socket.io): same refresh + reconnect.
 * - every RE-connect (not the first) refetches what could have been missed: events are not
 *   replayed, so "reconnected" must mean "consistent again".
 * - back online (the `online` event): if we are down, try now instead of waiting for the backoff.
 */
export function useSocketConnection() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const online = useOnlineStatus()
  const userId = status === "authenticated" ? (user?.id ?? null) : null

  useEffect(() => {
    if (!userId) return
    const socket = getSocket()
    let authRetries = 0
    let connectedOnce = false

    const refreshThenReconnect = () => {
      if (authRetries >= MAX_AUTH_RETRIES) return
      authRetries++
      refreshSession()
        .then(() => reconnectSocket())
        .catch(() => undefined) // 401 = session over: AuthProvider logs out and we disconnect below
    }
    const onConnect = () => {
      authRetries = 0
      if (connectedOnce) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      }
      connectedOnce = true
    }
    const onConnectError = (err: Error & { data?: { code?: string } }) => {
      if (err.data?.code && AUTH_CODES.has(err.data.code))
        refreshThenReconnect()
    }
    const onDisconnect = (reason: string) => {
      if (reason === "io server disconnect") refreshThenReconnect()
    }
    socket.on("connect", onConnect)
    socket.on("connect_error", onConnectError)
    socket.on("disconnect", onDisconnect)
    connectSocket(userId)
    return () => {
      socket.off("connect", onConnect)
      socket.off("connect_error", onConnectError)
      socket.off("disconnect", onDisconnect)
      releaseSocket()
    }
  }, [userId, queryClient])

  useEffect(() => {
    if (online && userId) reconnectSocket()
  }, [online, userId])
}
