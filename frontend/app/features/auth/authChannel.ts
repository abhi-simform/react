/**
 * Cross-tab auth events (10.7). `BroadcastChannel` delivers a message to every OTHER tab of
 * the same origin (never to the sender), so logging out in tab A can sign tab B out within a
 * moment. It carries no data, only the event: the cookie is shared by all tabs anyway.
 */
export type AuthMessage = "logout" | "login"

const NAME = "shopsphere-auth"
/**
 * A `BroadcastChannel` object does not hear ITSELF, but another object with the same name in the
 * SAME tab does (we open a short-lived one per send). So every message carries the sender's tab
 * id and listeners ignore their own.
 */
const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random())

export function broadcastAuth(message: AuthMessage): void {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(NAME)
  channel.postMessage({ from: TAB_ID, message })
  channel.close()
}

export function onAuthMessage(
  listener: (message: AuthMessage) => void
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined
  const channel = new BroadcastChannel(NAME)
  channel.onmessage = (
    event: MessageEvent<{ from?: string; message?: unknown }>
  ) => {
    const { from, message } = event.data ?? {}
    if (from === TAB_ID) return
    if (message === "logout" || message === "login") listener(message)
  }
  return () => channel.close()
}
