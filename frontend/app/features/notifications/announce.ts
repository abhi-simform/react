import { useSyncExternalStore } from "react"

/**
 * The text for the bell's polite live region. A tiny external store: `RealtimeSync` (which owns
 * the socket) writes it, the bell reads it, and neither imports the other. A timestamp suffix is
 * not needed: changing the text between two different notifications is what makes a live region
 * speak; the same title twice in a row is cleared in between.
 */
let text = ""
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function announceNotification(title: string) {
  text = ""
  emit()
  // Next tick: an identical message after a clear is announced again.
  setTimeout(() => {
    text = `New notification: ${title}`
    emit()
  }, 50)
}
export const useAnnouncement = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => text,
    () => ""
  )
