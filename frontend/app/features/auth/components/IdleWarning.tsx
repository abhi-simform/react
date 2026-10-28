import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCountdown } from "@/hooks/useCountdown"

import { useAuth } from "../AuthProvider"

/** Minutes without input before the warning; `VITE_IDLE_MINUTES` overrides (tests use 1). */
const IDLE_MS = (Number(import.meta.env.VITE_IDLE_MINUTES) || 30) * 60_000
/** The dialog opens this long before the automatic sign-out. */
const WARN_MS = Math.min(60_000, IDLE_MS / 2)
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
] as const

/**
 * 10.7: an unattended signed-in browser (shared computer) should not stay signed in forever.
 * After IDLE_MS without input a dialog counts down WARN_MS; "Stay signed in" refreshes the
 * session, otherwise the user is logged out. Activity is tracked in a ref (no re-render per
 * mouse move); a 1 s interval compares it with the clock. While the dialog is open, activity
 * no longer counts: the user must answer it.
 */
export function IdleWarning() {
  const { status, refresh, logout } = useAuth()
  const lastActivity = useRef(0)
  const [deadline, setDeadline] = useState<number | null>(null)
  const warningRef = useRef(false)
  const signedIn = status === "authenticated"

  useEffect(() => {
    if (!signedIn) return
    lastActivity.current = Date.now()
    const touch = () => {
      if (!warningRef.current) lastActivity.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, touch, { passive: true })
    )
    const timer = setInterval(() => {
      if (warningRef.current) return
      if (Date.now() - lastActivity.current >= IDLE_MS - WARN_MS) {
        warningRef.current = true
        setDeadline(lastActivity.current + IDLE_MS)
      }
    }, 1000)
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch))
      clearInterval(timer)
      warningRef.current = false
      setDeadline(null)
    }
  }, [signedIn])

  function stay() {
    warningRef.current = false
    lastActivity.current = Date.now()
    setDeadline(null)
    void refresh().catch(() => undefined) // a dead session is handled by the 401 path
  }
  function leave(reason: "idle" | "chosen") {
    warningRef.current = false
    setDeadline(null)
    void logout()
    if (reason === "idle")
      toast.info("You were signed out after a period of inactivity.")
  }

  // Mounted only while warning: no exit animation, nothing left behind after logout.
  if (deadline === null) return null
  return (
    <AlertDialog open onOpenChange={() => undefined}>
      <AlertDialogContent>
        <IdleCountdown deadline={deadline} onExpired={() => leave("idle")} />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => leave("chosen")}>
            Log out
          </AlertDialogCancel>
          <AlertDialogAction onClick={stay}>Stay signed in</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function IdleCountdown({
  deadline,
  onExpired,
}: {
  deadline: number
  onExpired: () => void
}) {
  const { remainingMs, isExpired } = useCountdown(deadline)
  useEffect(() => {
    if (isExpired) onExpired()
  }, [isExpired, onExpired])
  return (
    <AlertDialogHeader>
      <AlertDialogTitle>Are you still there?</AlertDialogTitle>
      <AlertDialogDescription>
        For your security you will be signed out in{" "}
        {Math.ceil(remainingMs / 1000)} seconds.
      </AlertDialogDescription>
    </AlertDialogHeader>
  )
}
