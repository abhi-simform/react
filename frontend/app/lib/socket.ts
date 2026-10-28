import { io, type Socket } from "socket.io-client"

import { getApiConfig } from "@/lib/api/client"
import { env } from "@/lib/env"

/**
 * THE socket (11.9): one lazily created Socket.io client for the whole app. `io()` inside a
 * component would open a new connection per render; a module singleton cannot. It is created
 * disconnected (`autoConnect: false`): the realtime feature connects it when a user is signed in
 * and disconnects it on logout.
 *
 * - `auth` is a CALLBACK, not an object: Socket.io calls it on every (re)connection attempt, so a
 *   reconnect after the access token was refreshed sends the CURRENT token, not the one from the
 *   first connect (the stale-token bug).
 * - The API's origin is derived from `VITE_API_URL` (`http://host:4000/api/v1` -> `http://host:4000`):
 *   the socket server shares the API's port, under `/socket.io`.
 * - `lib/` must not import from `features/`, so the token comes through `getApiConfig()`.
 */
export type SocketStatus =
  | "idle" // never connected / signed out
  | "connecting" // first attempt or the token refresh round trip
  | "connected"
  | "disconnected" // lost; Socket.io retries with backoff by itself

let socket: Socket | null = null
let status: SocketStatus = "idle"
const listeners = new Set<() => void>()

function setStatus(next: SocketStatus) {
  if (status === next) return
  status = next
  listeners.forEach((l) => l())
}
export const getSocketStatus = () => status
/** For `useSyncExternalStore`. */
export function subscribeSocketStatus(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSocket(): Socket {
  if (socket) return socket
  const origin = new URL(env.VITE_API_URL).origin
  socket = io(origin, {
    autoConnect: false,
    withCredentials: true,
    auth: (cb) => cb({ token: getApiConfig().getAccessToken?.() ?? "" }),
  })
  socket.on("connect", () => setStatus("connected"))
  socket.on("disconnect", () => setStatus("disconnected"))
  // A refused handshake (expired token) lands here; the feature decides what to do about it.
  socket.on("connect_error", () => setStatus("disconnected"))
  // Dev only, like `window.queryClient`: `__socket.connected`, `__socket.disconnect()` ...
  if (import.meta.env.DEV && typeof window !== "undefined")
    (window as unknown as { __socket: Socket }).__socket = socket
  return socket
}

// ---- connecting, StrictMode-safe ---------------------------------------------------------------

let connectedAs: string | null = null
let releaseTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Connect for `userKey` (the signed-in user's id). Idempotent: calling it again while connected or
 * connecting does nothing, so two components (or StrictMode's double effect) share ONE connection.
 * If it is still connected as a DIFFERENT user (a direct account switch), it reconnects, so the
 * previous user's socket (and room) is gone before the new one joins.
 */
export function connectSocket(userKey: string) {
  clearTimeout(releaseTimer)
  const s = getSocket()
  if (connectedAs !== null && connectedAs !== userKey && s.active)
    s.disconnect()
  connectedAs = userKey
  if (!s.active) {
    setStatus("connecting")
    s.connect()
  }
}

/**
 * Disconnect, but on a 0 ms timer: React StrictMode runs an effect's cleanup and then the effect
 * again straight away; the second `connectSocket` cancels this timer, so the dev double-mount
 * produces one connection instead of connect-disconnect-connect.
 */
export function releaseSocket() {
  clearTimeout(releaseTimer)
  releaseTimer = setTimeout(() => {
    connectedAs = null
    socket?.disconnect()
    setStatus("idle")
  }, 0)
}

/** Re-open after a refused handshake (the caller refreshed the token first). */
export function reconnectSocket() {
  const s = getSocket()
  if (connectedAs === null) return // signed out in the meantime
  if (!s.active) {
    setStatus("connecting")
    s.connect()
  }
}
