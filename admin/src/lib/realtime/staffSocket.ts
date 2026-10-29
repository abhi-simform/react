import { io, type Socket } from "socket.io-client"
import { env } from "@/lib/env"
import { getAccessToken, refresh } from "@/lib/auth/session"

// ONE socket for the signed-in admin (a copy of the storefront idea, trimmed). The token goes in the
// HANDSHAKE (`auth: { token }`); the server puts admin sockets in the "staff" room and pushes
// `order:new` / `order:status`. The server drops a socket when its access token expires
// (`auth:expired`): we refresh the token and reconnect. Sellers do not connect (no staff room).

export type StaffEvents = {
  "order:new": { orderId: string; orderNumber: string; total: number }
  "order:status": {
    orderId: string
    orderNumber: string
    status: string
    from: string | null
  }
}
type Listener<TEvent extends keyof StaffEvents> = (
  p: StaffEvents[TEvent]
) => void

let socket: Socket | null = null
const origin = () => env.API_URL.replace(/\/api\/v1$/, "")

async function reconnectWithFreshToken() {
  if (!socket) return
  if (await refresh()) {
    socket.auth = { token: getAccessToken() }
    socket.connect()
  }
}

export function connectStaffSocket() {
  if (socket) return socket
  socket = io(origin(), {
    auth: { token: getAccessToken() },
    withCredentials: true,
    autoConnect: false,
    reconnectionDelayMax: 10_000,
  })
  socket.on("auth:expired", () => void reconnectWithFreshToken())
  socket.on("connect_error", (err) => {
    const code = (err as { data?: { code?: string } }).data?.code
    if (code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN")
      void reconnectWithFreshToken()
  })
  socket.connect()
  return socket
}

export function disconnectStaffSocket() {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}

type TypedSocket = Socket<{
  [TEvent in keyof StaffEvents]: (p: StaffEvents[TEvent]) => void
}>

export function onStaffEvent<TEvent extends keyof StaffEvents>(
  event: TEvent,
  listener: Listener<TEvent>
) {
  const s = connectStaffSocket() as unknown as TypedSocket
  // The cast is the price of socket.io's loose default typing: the map above says what this app emits.
  s.on(event, listener as never)
  return () => void s.off(event, listener as never)
}
