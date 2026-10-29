import type { Server as HttpServer } from "node:http"
import jwt from "jsonwebtoken"
import { Server } from "socket.io"
import { env } from "../config/env.js"
import { logger } from "../config/logger.js"
import type { AccessPayload } from "../middleware/auth.js"

/**
 * Socket.io, authenticated in the HANDSHAKE: `io(url, { auth: { token } })`. A bad or expired token
 * is refused with `connect_error` whose `data.code` is TOKEN_EXPIRED / INVALID_TOKEN, so the client
 * knows whether refreshing the access token and reconnecting can help. Each user's sockets (any
 * number of tabs/devices) join the room `user:<id>`; the server only ever emits to that room, so a
 * client cannot receive another user's events.
 *
 * A token is checked once at the handshake, so a socket would outlive it. To keep "logged out =
 * cut off within the token lifetime" true, the server disconnects a socket when its token expires
 * (event `auth:expired`, then a server disconnect); the client refreshes and reconnects.
 */
let io: Server | null = null

export const userRoom = (userId: string) => `user:${userId}`
/** Admin sockets also join this room: the "new orders" indicator listens to it. */
export const STAFF_ROOM = "staff"

export function initRealtime(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
    serveClient: false,
  })

  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token
    if (typeof token !== "string" || !token) {
      const err = new Error("Authentication required") as Error & { data?: unknown }
      err.data = { code: "UNAUTHORIZED" }
      return next(err)
    }
    try {
      const p = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload & {
        exp: number
      }
      socket.data.userId = p.sub
      socket.data.role = p.role
      socket.data.exp = p.exp
      next()
    } catch (e) {
      const expired = e instanceof jwt.TokenExpiredError
      const err = new Error(
        expired ? "Access token expired" : "Invalid token"
      ) as Error & {
        data?: unknown
      }
      err.data = { code: expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN" }
      next(err)
    }
  })

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string
    void socket.join(userRoom(userId))
    if (socket.data.role === "admin") void socket.join(STAFF_ROOM)
    socket.emit("ready", { userId, serverTime: new Date().toISOString() })
    logger.debug({ userId, sid: socket.id }, "socket connected")

    const msLeft = (socket.data.exp as number) * 1000 - Date.now()
    const timer = setTimeout(
      () => {
        socket.emit("auth:expired")
        socket.disconnect(true)
      },
      Math.max(0, msLeft)
    )
    timer.unref()
    socket.on("disconnect", () => clearTimeout(timer))
  })
  return io
}

/** No-op when realtime is not running (unit tests that never start a server). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload)
}

/** Admins only (the room is joined by role in the handshake, never by a client request). */
export function emitToStaff(event: string, payload: unknown) {
  io?.to(STAFF_ROOM).emit(event, payload)
}

export async function closeRealtime() {
  const current = io
  io = null
  if (current) await current.close()
}
